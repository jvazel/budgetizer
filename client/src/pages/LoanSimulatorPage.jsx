import { useState, useContext, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Calculator, ChevronDown, ChevronUp, TrendingDown,
  AlertTriangle, Info, Percent, Clock, Coins, CreditCard
} from 'lucide-react';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useEffect } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (val, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);

const fmtPct = (val) => `${val.toFixed(1)} %`;

// Calcule la mensualité hors assurance (formule prêt à taux fixe)
function computeMonthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

// Génère le tableau d'amortissement complet
function buildAmortizationSchedule(principal, annualRate, months, monthlyInsurance) {
  const r = annualRate / 100 / 12;
  const payment = computeMonthlyPayment(principal, annualRate, months);
  let remaining = principal;
  const rows = [];

  for (let i = 1; i <= months; i++) {
    const interest = remaining * r;
    const capitalPart = payment - interest;
    remaining = Math.max(0, remaining - capitalPart);
    rows.push({
      month: i,
      payment: payment + monthlyInsurance,
      interest,
      capitalPart,
      insurance: monthlyInsurance,
      remaining,
    });
  }
  return rows;
}

// Agrège le tableau d'amortissement par année pour les graphiques
function buildYearlyData(schedule, principal) {
  const years = {};
  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    if (!years[year]) {
      years[year] = { year: `An ${year}`, interestCumul: 0, capitalCumul: 0, remaining: 0 };
    }
    years[year].interestCumul += row.interest;
    years[year].capitalCumul += row.capitalPart;
    years[year].remaining = row.remaining;
  }
  // Add running cumulative
  let cumInterest = 0;
  let cumCapital = 0;
  return Object.values(years).map(y => {
    cumInterest += y.interestCumul;
    cumCapital += y.capitalCumul;
    return {
      year: y.year,
      remaining: Math.round(y.remaining),
      interetsCumuls: Math.round(cumInterest),
      capitalRembourse: Math.round(cumCapital),
    };
  });
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated border border-border/40 rounded-2xl p-3 shadow-xl text-xs space-y-1 min-w-[160px]">
      <p className="font-bold text-primary mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-secondary">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold text-primary font-mono">
            {fmt(entry.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, color = 'text-accent', highlight = false }) => (
  <div className={`bg-surface-2 rounded-[20px] border p-4 space-y-2 ${highlight ? 'border-accent/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : 'border-border/40'}`}>
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${highlight ? 'bg-accent/15' : 'bg-surface'} shrink-0`}>
        <Icon size={15} className={highlight ? 'text-accent' : 'text-secondary'} />
      </div>
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-xl font-black tracking-tight ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-muted leading-snug">{sub}</p>}
  </div>
);

// ─── Input Field ──────────────────────────────────────────────────────────────
const InputField = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  id,
  rangeMin,
  rangeMax,
  rangeStep,
  rangeMinLabel,
  rangeMaxLabel
}) => {
  const pct = rangeMax > rangeMin ? Math.max(0, Math.min(100, ((Number(value) || 0) - rangeMin) / (rangeMax - rangeMin) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="w-full bg-surface-2 border border-border/40 rounded-[14px] px-4 py-3 text-sm font-bold text-primary focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all pr-14"
        />
        {suffix && (
          <span className="absolute right-4 text-xs font-bold text-muted pointer-events-none">{suffix}</span>
        )}
      </div>
      {rangeMin !== undefined && rangeMax !== undefined && (
        <div className="px-1 pt-1 select-none space-y-1">
          <input
            type="range"
            min={rangeMin}
            max={rangeMax}
            step={rangeStep || step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-1 bg-border/40 rounded-lg appearance-none cursor-pointer accent-accent transition-all hover:bg-border/60"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`
            }}
          />
          <div className="flex justify-between text-[9px] text-muted font-bold">
            <span>{rangeMinLabel || rangeMin}</span>
            <span>{rangeMaxLabel || rangeMax}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Amortization Table (accordion) ──────────────────────────────────────────
const AmortizationTable = ({ schedule, currency }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-surface-2 rounded-[20px] border border-border/40 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-bold text-primary flex items-center gap-2">
          <CreditCard size={15} className="text-accent" />
          Tableau d'amortissement ({schedule.length} mois)
        </span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <div className="overflow-x-auto max-h-80 overflow-y-auto no-scrollbar border-t border-border/20">
          <table className="w-full text-[10px] text-left">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="border-b border-border/20">
                {['Mois', 'Mensualité', 'Intérêts', 'Capital', 'Assurance', 'Capital restant'].map(h => (
                  <th key={h} className="px-3 py-2 font-bold text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr
                  key={row.month}
                  className={`border-b border-border/10 ${i % 12 === 0 ? 'bg-accent/5' : 'hover:bg-white/[0.01]'}`}
                >
                  <td className="px-3 py-1.5 font-bold text-secondary">{row.month}</td>
                  <td className="px-3 py-1.5 font-bold text-primary">{fmt(row.payment, currency)}</td>
                  <td className="px-3 py-1.5 text-warning">{fmt(row.interest, currency)}</td>
                  <td className="px-3 py-1.5 text-accent">{fmt(row.capitalPart, currency)}</td>
                  <td className="px-3 py-1.5 text-info">{fmt(row.insurance, currency)}</td>
                  <td className="px-3 py-1.5 text-secondary font-mono">{fmt(row.remaining, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const LoanSimulatorPage = () => {
  const { user } = useContext(AuthContext);
  const currency = user?.currency?.code || 'EUR';

  // Form state
  const [principal, setPrincipal] = useState(200000);
  const [annualRate, setAnnualRate] = useState(3.5);
  const [durationYears, setDurationYears] = useState(20);
  const [deposit, setDeposit] = useState(20000);
  const [monthlyInsurance, setMonthlyInsurance] = useState(50);

  // Real budget data from API
  const [avgMonthlyIncome, setAvgMonthlyIncome] = useState(null);
  const [avgMonthlyExpenses, setAvgMonthlyExpenses] = useState(null);
  const [loadingBudget, setLoadingBudget] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        const res = await api.get('/dashboard', {
          params: {
            startDate: sixMonthsAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0],
          }
        });

        const d = res.data;
        if (d?.incomes != null) setAvgMonthlyIncome(d.incomes / 6);
        if (d?.expenses != null) setAvgMonthlyExpenses(Math.abs(d.expenses) / 6);
      } catch {
        // silently fail — budget data is optional
      } finally {
        setLoadingBudget(false);
      }
    };
    fetchDashboard();
  }, []);

  // Effective principal after deposit
  const effectivePrincipal = Math.max(0, principal - deposit);
  const months = durationYears * 12;

  // Core calculations
  const schedule = useMemo(
    () => effectivePrincipal > 0 && annualRate >= 0 && months > 0
      ? buildAmortizationSchedule(effectivePrincipal, annualRate, months, monthlyInsurance)
      : [],
    [effectivePrincipal, annualRate, months, monthlyInsurance]
  );

  const basePayment = useMemo(
    () => schedule.length > 0 ? schedule[0].payment : 0,
    [schedule]
  );

  const totalCost = basePayment * months;
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const totalInsurance = monthlyInsurance * months;
  const debtRatio = avgMonthlyIncome ? (basePayment / avgMonthlyIncome) * 100 : null;

  // Yearly chart data
  const yearlyData = useMemo(() => buildYearlyData(schedule, effectivePrincipal), [schedule, effectivePrincipal]);

  // Donut data
  const donutData = useMemo(() => {
    if (!schedule.length) return [];
    const { interest, capitalPart, insurance } = schedule[0];
    return [
      { name: 'Capital', value: Math.round(capitalPart), color: '#10b981' },
      { name: 'Intérêts', value: Math.round(interest), color: '#f59e0b' },
      { name: 'Assurance', value: Math.round(insurance), color: '#3b82f6' },
    ].filter(d => d.value > 0);
  }, [schedule]);

  // Budget impact chart data
  const budgetImpactData = useMemo(() => {
    if (avgMonthlyIncome == null || avgMonthlyExpenses == null) return [];
    const netBefore = avgMonthlyIncome - avgMonthlyExpenses;
    const netAfter = netBefore - basePayment;
    return [
      { label: 'Avant prêt', solde: Math.round(netBefore) },
      { label: 'Après prêt', solde: Math.round(netAfter) },
    ];
  }, [avgMonthlyIncome, avgMonthlyExpenses, basePayment]);

  const debtRatioColor = debtRatio == null ? 'text-muted'
    : debtRatio < 33 ? 'text-accent'
    : debtRatio < 40 ? 'text-warning'
    : 'text-danger';

  return (
    <>
      <HeaderTitle collapsible={true}>Simulateur de prêt</HeaderTitle>
      <HeaderBackButton to="/" />

      {/* Large Collapsible Header Title on Page */}
      <div className="mb-5 mt-2 px-1">
        <div className="text-2xl font-extrabold text-primary tracking-tight flex items-center gap-2">
          <Calculator size={22} className="text-accent shrink-0" />
          Simulateur de prêt
        </div>
        <p className="text-[11px] text-secondary mt-0.5 font-medium">Calculez vos mensualités et visualisez l'impact sur votre budget.</p>
      </div>

      {/* ── FORM ── */}
      <div className="bg-surface-2 rounded-[24px] border border-border/40 p-5 mb-5 space-y-4">
        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Paramètres du prêt</p>

        <div className="space-y-5">
          <InputField
            id="loan-principal"
            label="Montant emprunté"
            value={principal}
            onChange={v => setPrincipal(Number(v))}
            min={1000} step={1000}
            suffix={currency}
            rangeMin={10000}
            rangeMax={1000000}
            rangeStep={5000}
            rangeMinLabel="10k €"
            rangeMaxLabel="1M €"
          />
          <InputField
            id="loan-deposit"
            label="Apport personnel"
            value={deposit}
            onChange={v => setDeposit(Number(v))}
            min={0} step={1000}
            suffix={currency}
            rangeMin={0}
            rangeMax={500000}
            rangeStep={5000}
            rangeMinLabel="0 €"
            rangeMaxLabel="500k €"
          />
          <InputField
            id="loan-rate"
            label="Taux annuel"
            value={annualRate}
            onChange={v => setAnnualRate(Number(v))}
            min={0} max={30} step={0.05}
            suffix="%"
            rangeMin={0.1}
            rangeMax={15}
            rangeStep={0.05}
            rangeMinLabel="0.1 %"
            rangeMaxLabel="15 %"
          />
          <InputField
            id="loan-duration"
            label="Durée"
            value={durationYears}
            onChange={v => setDurationYears(Number(v))}
            min={1} max={30} step={1}
            suffix="ans"
            rangeMin={1}
            rangeMax={30}
            rangeStep={1}
            rangeMinLabel="1 an"
            rangeMaxLabel="30 ans"
          />
          <InputField
            id="loan-insurance"
            label="Assurance / mois"
            value={monthlyInsurance}
            onChange={v => setMonthlyInsurance(Number(v))}
            min={0} step={1}
            suffix={currency}
            rangeMin={0}
            rangeMax={500}
            rangeStep={5}
            rangeMinLabel="0 €"
            rangeMaxLabel="500 €"
          />
        </div>

        {deposit > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-secondary bg-accent/5 border border-accent/15 rounded-xl px-3 py-2">
            <Info size={12} className="text-accent shrink-0" />
            Capital net à financer : <span className="font-bold text-accent ml-1">{fmt(effectivePrincipal, currency)}</span>
          </div>
        )}
      </div>

      {/* ── KPI CARDS ── */}
      {schedule.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <KpiCard
              icon={Coins}
              label="Mensualité totale"
              value={fmt(basePayment, currency)}
              sub="Capital + intérêts + assurance"
              highlight
            />
            <KpiCard
              icon={Percent}
              label="Taux d'endettement"
              value={debtRatio != null ? fmtPct(debtRatio) : '—'}
              sub={debtRatio != null
                ? (debtRatio < 33 ? '✓ Inférieur à 33 %' : debtRatio < 40 ? '⚠ Entre 33 % et 40 %' : '✗ Dépasse 40 %')
                : 'Revenus non disponibles'}
              color={debtRatioColor}
            />
            <KpiCard
              icon={TrendingDown}
              label="Coût total des intérêts"
              value={fmt(totalInterest, currency)}
              sub={`+ ${fmt(totalInsurance, currency)} d'assurance`}
              color="text-warning"
            />
            <KpiCard
              icon={Clock}
              label="Coût total du prêt"
              value={fmt(totalCost, currency)}
              sub={`Sur ${months} mois (${durationYears} ans)`}
              color="text-info"
            />
          </div>

          {/* ── DEBT RATIO ALERT ── */}
          {debtRatio != null && debtRatio >= 33 && (
            <div className={`flex items-start gap-3 rounded-[16px] border px-4 py-3 mb-5 text-xs ${
              debtRatio >= 40
                ? 'bg-danger/5 border-danger/20 text-danger'
                : 'bg-warning/5 border-warning/20 text-warning'
            }`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {debtRatio >= 40
                  ? `Votre taux d'endettement estimé (${fmtPct(debtRatio)}) dépasse 40 %, ce qui rend l'obtention du prêt difficile.`
                  : `Votre taux d'endettement estimé (${fmtPct(debtRatio)}) se situe entre 33 % et 40 %. Il est recommandé de rester sous 33 %.`
                }
              </p>
            </div>
          )}

          {/* ── CHART 1 : Amortissement ── */}
          <div className="bg-surface-2 rounded-[24px] border border-border/40 p-4 mb-5">
            <p className="text-xs font-bold text-primary mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              Courbes d'amortissement
            </p>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRemaining" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCapital" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="year" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip content={<CustomTooltip currency={currency} />} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="remaining" name="Capital restant dû" stroke="#f43f5e" fill="url(#gradRemaining)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="interetsCumuls" name="Intérêts cumulés" stroke="#f59e0b" fill="url(#gradInterest)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="capitalRembourse" name="Capital remboursé" stroke="#10b981" fill="url(#gradCapital)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── CHART 2 : Donut répartition mensuelle ── */}
          <div className="bg-surface-2 rounded-[24px] border border-border/40 p-4 mb-5">
            <p className="text-xs font-bold text-primary mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-info inline-block" />
              Répartition d'une mensualité
            </p>
            <div className="flex items-center gap-4">
              <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v, currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[11px] text-secondary">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-[11px] font-bold text-primary">{fmt(d.value, currency)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <span className="text-[11px] font-bold text-muted">Total</span>
                  <span className="text-[11px] font-black text-accent">{fmt(basePayment, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CHART 3 : Impact budgétaire ── */}
          <div className="bg-surface-2 rounded-[24px] border border-border/40 p-4 mb-5">
            <p className="text-xs font-bold text-primary mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple inline-block" />
              Impact sur votre budget mensuel
            </p>

            {loadingBudget ? (
              <div className="py-8 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
              </div>
            ) : budgetImpactData.length === 0 ? (
              <div className="py-6 text-center">
                <Info size={20} className="text-muted mx-auto mb-2" />
                <p className="text-xs text-muted">
                  Aucune donnée budgétaire disponible.<br />Ajoutez des transactions pour voir l'impact réel.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-secondary mb-4 leading-snug">
                  Basé sur vos revenus et dépenses moyens sur 6 mois.
                </p>
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetImpactData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                        tickFormatter={v => `${Math.round(v / 1000)}k`} />
                      <Tooltip content={<CustomTooltip currency={currency} />} />
                      <Bar dataKey="solde" name="Solde net" radius={[8, 8, 0, 0]}>
                        {budgetImpactData.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={entry.solde >= 0 ? '#10b981' : '#f43f5e'}
                            opacity={i === 1 ? 0.85 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {budgetImpactData[1]?.solde < 0 && (
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-danger bg-danger/5 border border-danger/15 rounded-xl px-3 py-2">
                    <AlertTriangle size={11} className="shrink-0" />
                    Ce prêt entraîne un solde mensuel négatif avec votre budget actuel.
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── TABLE ACCORDÉON ── */}
          <AmortizationTable schedule={schedule} currency={currency} />
          <div className="h-4" />
        </>
      )}

      {/* Empty state if invalid params */}
      {schedule.length === 0 && (
        <div className="text-center py-16 bg-surface-2 rounded-[28px] border border-dashed border-border/40">
          <Calculator size={32} className="mx-auto text-muted/50 mb-3" />
          <p className="text-muted text-sm font-medium">Saisissez les paramètres du prêt</p>
          <p className="text-muted text-xs mt-1">La simulation s'affichera automatiquement.</p>
        </div>
      )}
    </>
  );
};

export default LoanSimulatorPage;
