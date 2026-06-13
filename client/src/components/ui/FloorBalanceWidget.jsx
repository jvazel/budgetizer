import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Select from './Select';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Settings,
  AlertTriangle,
  Calendar,
  Sparkles,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import {
  getEstimatedPaycheckDate,
  calculateFloorBalance,
  calculateFloorProjection,
} from '../../utils/floorBalanceHelper';
import { triggerHaptic } from '../../utils/hapticHelper';

const FloorBalanceWidget = ({ accounts = [], upcoming = [], loading = false }) => {
  const { user } = useContext(AuthContext);
  const currencyCode = user?.currency?.code || 'EUR';

  // ─── State ───────────────────────────────────────────────────────────────────
  const [paycheckDayConfig, setPaycheckDayConfig] = useState(() => {
    return localStorage.getItem('budgetizer_paycheck_day') || 'auto';
  });

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('accounts'); // 'accounts' | 'paycheck'

  const [excludedIds, setExcludedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('budgetizer_excluded_floor_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedAccountIds, setSelectedAccountIds] = useState(() => {
    try {
      const saved = localStorage.getItem('budgetizer_floor_selected_accounts');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);

  // ─── Persistence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('budgetizer_excluded_floor_expenses', JSON.stringify(excludedIds));
  }, [excludedIds]);

  const handlePaycheckDayChange = (value) => {
    setPaycheckDayConfig(value);
    localStorage.setItem('budgetizer_paycheck_day', value);
  };

  const toggleExpenseExclusion = (id) => {
    triggerHaptic('light');
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ─── Resolved active selected accounts IDs ───────────────────────────────────
  const activeSelectedIds = useMemo(() => {
    if (selectedAccountIds && Array.isArray(selectedAccountIds) && selectedAccountIds.length > 0) {
      const existingIds = selectedAccountIds.filter(id => accounts.some(acc => acc._id === id));
      if (existingIds.length > 0) return existingIds;
    }

    // Default: select checking accounts
    const checkingAccounts = accounts.filter(acc => acc.type === 'checking');
    if (checkingAccounts.length > 0) {
      return checkingAccounts.map(acc => acc._id);
    }
    // Fallback: select non-credit accounts
    const nonCreditAccounts = accounts.filter(acc => acc.type !== 'credit');
    if (nonCreditAccounts.length > 0) {
      return nonCreditAccounts.map(acc => acc._id);
    }
    return accounts.map(acc => acc._id);
  }, [accounts, selectedAccountIds]);

  const handleAccountToggle = (id) => {
    triggerHaptic('light');
    let nextIds;
    if (activeSelectedIds.includes(id)) {
      if (activeSelectedIds.length === 1) return; // Keep at least one account
      nextIds = activeSelectedIds.filter(item => item !== id);
    } else {
      nextIds = [...activeSelectedIds, id];
    }
    setSelectedAccountIds(nextIds);
    localStorage.setItem('budgetizer_floor_selected_accounts', JSON.stringify(nextIds));
  };

  const handleSelectAllAccounts = () => {
    triggerHaptic('light');
    const allIds = accounts.map(acc => acc._id);
    setSelectedAccountIds(allIds);
    localStorage.setItem('budgetizer_floor_selected_accounts', JSON.stringify(allIds));
  };

  const handleSelectOnlyCheckingAccounts = () => {
    triggerHaptic('light');
    const checkingIds = accounts.filter(acc => acc.type === 'checking').map(acc => acc._id);
    if (checkingIds.length > 0) {
      setSelectedAccountIds(checkingIds);
      localStorage.setItem('budgetizer_floor_selected_accounts', JSON.stringify(checkingIds));
    }
  };

  // ─── Dynamic Balances ────────────────────────────────────────────────────────
  const { actualBalance, creditBalance } = useMemo(() => {
    let actualSum = 0;
    let creditSum = 0;

    accounts.forEach(acc => {
      if (activeSelectedIds.includes(acc._id)) {
        if (acc.type === 'credit') {
          creditSum += acc.balance;
        } else {
          actualSum += acc.balance;
        }
      }
    });

    return {
      actualBalance: actualSum,
      creditBalance: creditSum
    };
  }, [accounts, activeSelectedIds]);

  const baseBalance = actualBalance + creditBalance;

  // ─── Derived data ────────────────────────────────────────────────────────────
  const upcomingIncomes = useMemo(() => upcoming.filter((tx) => tx.type === 'income'), [upcoming]);

  const nextPaycheckDate = useMemo(
    () => getEstimatedPaycheckDate(new Date(), upcomingIncomes, paycheckDayConfig),
    [upcomingIncomes, paycheckDayConfig]
  );

  const pendingRecurringExpenses = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const paycheckStart = new Date(
      nextPaycheckDate.getFullYear(),
      nextPaycheckDate.getMonth(),
      nextPaycheckDate.getDate()
    ).getTime();

    return upcoming.filter((tx) => {
      if (tx.type !== 'expense') return false;
      const txDate = new Date(tx.date);
      const txTime = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
      return txTime >= todayStart && txTime < paycheckStart;
    });
  }, [upcoming, nextPaycheckDate]);

  const totalPendingExpenses = useMemo(() => {
    const activeExpenses = pendingRecurringExpenses.filter((tx) => !excludedIds.includes(tx._id));
    return activeExpenses.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [pendingRecurringExpenses, excludedIds]);

  const floorBalance = useMemo(
    () => calculateFloorBalance(baseBalance, new Date(), upcoming, nextPaycheckDate, excludedIds),
    [baseBalance, upcoming, nextPaycheckDate, excludedIds]
  );

  const comfortRatio = actualBalance > 0 ? floorBalance / actualBalance : 0;
  const isComfortable = floorBalance > 0 && comfortRatio > 0.2;

  const projectionData = useMemo(
    () => calculateFloorProjection(baseBalance, new Date(), upcoming, excludedIds),
    [baseBalance, upcoming, excludedIds]
  );

  const hasRiskOfNegative = useMemo(
    () => projectionData.some((pt) => pt.balance < 0),
    [projectionData]
  );

  // ─── Formatter ───────────────────────────────────────────────────────────────
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);

  // ─── Contextual micro-phrase ─────────────────────────────────────────────────
  const contextPhrase = useMemo(() => {
    const today = new Date();
    const daysLeft = Math.ceil((nextPaycheckDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const activePending = pendingRecurringExpenses.filter((tx) => !excludedIds.includes(tx._id));

    if (hasRiskOfNegative) {
      return `Ton solde risque de passer en négatif avant ta paye — vérifie tes charges.`;
    }
    if (!isComfortable && activePending.length > 0) {
      const dateStr = nextPaycheckDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      return `${activePending.length} facture${activePending.length > 1 ? 's' : ''} en attente d'ici ta paye le ${dateStr}.`;
    }
    if (daysLeft <= 3) {
      return `Ta paye arrive dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} — toutes tes charges sont couvertes. ✓`;
    }
    if (activePending.length === 0) {
      return `Aucune charge planifiée d'ici ta paye — tu es bien couvert. ✓`;
    }
    return `${activePending.length} charge${activePending.length > 1 ? 's prévues' : ' prévue'} d'ici ta paye — tout est sous contrôle. ✓`;
  }, [nextPaycheckDate, hasRiskOfNegative, isComfortable, pendingRecurringExpenses, excludedIds]);

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mt-4 mb-6 bg-surface-2/80 p-5 rounded-[24px] border border-white/[0.06] shadow-[0_12px_24px_rgba(0,0,0,0.35)] animate-pulse space-y-4">
        <div className="h-4 w-1/3 bg-surface/60 rounded" />
        <div className="h-10 w-2/3 bg-surface/60 rounded" />
        <div className="h-4 w-1/2 bg-surface/40 rounded" />
        <div className="h-20 w-full bg-surface/40 rounded" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <section className="mb-6 mt-4">
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-2/80 via-surface/95 to-surface-2/80 backdrop-blur-md rounded-[24px] border border-white/[0.06] p-5 shadow-[0_12px_24px_rgba(0,0,0,0.35)] space-y-4 transition-all duration-300">

        {/* Decorative glows */}
        <div className={`absolute -right-16 -bottom-16 w-36 h-36 rounded-full blur-[40px] pointer-events-none transition-colors duration-700 ${isComfortable ? 'bg-accent/10' : 'bg-danger/10'}`} />
        <div className="absolute -left-16 -top-16 w-36 h-36 bg-info/10 rounded-full blur-[40px] pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[11px] text-secondary/80 font-bold tracking-widest uppercase">Solde disponible</p>
            <h2 className={`text-4xl font-extrabold font-premium-numbers tracking-tight mt-1 transition-colors ${
              isComfortable ? 'text-accent' : floorBalance <= 0 ? 'text-danger' : 'text-warning'
            }`}>
              {formatCurrency(floorBalance)}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] text-muted font-medium">
                Bancaire :&nbsp;
                <span className="font-semibold text-secondary font-premium-numbers">{formatCurrency(actualBalance)}</span>
              </span>
              {totalPendingExpenses > 0 && (
                <span className="text-[10px] font-bold text-warning/90 bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-full font-premium-numbers">
                  −{formatCurrency(totalPendingExpenses)} réservés
                </span>
              )}
              {creditBalance !== 0 && (
                <span className="text-[10px] font-bold text-danger/80 bg-danger/10 border border-danger/15 px-1.5 py-0.5 rounded-full font-premium-numbers">
                  {formatCurrency(Math.abs(creditBalance))} en cartes
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
              showSettings
                ? 'bg-accent/10 border-accent/20 text-accent'
                : 'bg-white/[0.05] border-white/[0.08] text-secondary hover:text-primary active:bg-white/[0.03]'
            }`}
            aria-label="Configurer le jour de paye"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Contextual micro-phrase */}
        <div className={`relative z-10 flex items-center gap-2 text-[10px] font-semibold rounded-xl px-3 py-2.5 border transition-colors ${
          hasRiskOfNegative || !isComfortable
            ? 'bg-danger/10 border-danger/20 text-danger'
            : 'bg-accent/10 border-accent/20 text-accent'
        }`}>
          {hasRiskOfNegative || !isComfortable ? (
            <AlertTriangle size={13} className="shrink-0" />
          ) : (
            <Sparkles size={13} className="shrink-0" />
          )}
          <span className="leading-relaxed">{contextPhrase}</span>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="relative z-[9999] bg-surface/50 border border-border/20 rounded-2xl p-4 space-y-4 animate-fade-in">
            {/* Header Settings */}
            <div className="flex justify-between items-center pb-2 border-b border-border/20">
              <span className="text-xs font-extrabold uppercase tracking-wide text-primary">Configuration du solde</span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[10px] font-bold text-accent hover:underline"
              >
                Fermer
              </button>
            </div>

            {/* Section 1: Accounts */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Wallet size={14} className="text-accent" /> Comptes inclus
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllAccounts}
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-white/[0.05] border border-border/30 rounded hover:bg-white/[0.1] active:scale-95 text-primary transition-all"
                  >
                    Tous
                  </button>
                  {accounts.some(acc => acc.type === 'checking') && (
                    <button
                      type="button"
                      onClick={handleSelectOnlyCheckingAccounts}
                      className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-white/[0.05] border border-border/30 rounded hover:bg-white/[0.1] active:scale-95 text-primary transition-all"
                    >
                      Courants
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[9px] text-muted leading-relaxed">
                Sélectionnez les comptes à inclure dans le calcul du solde disponible.
              </p>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 no-scrollbar border border-border/10 rounded-xl p-1.5 bg-surface/25">
                {accounts.length === 0 ? (
                  <p className="text-[9px] text-muted text-center py-4">Aucun compte disponible.</p>
                ) : (
                  accounts.map((acc) => {
                    const isSelected = activeSelectedIds.includes(acc._id);
                    return (
                      <div
                        key={acc._id}
                        onClick={() => handleAccountToggle(acc._id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-surface border-border/50 shadow-sm'
                            : 'bg-transparent border-transparent opacity-50 hover:opacity-85'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-secondary shrink-0">
                            {isSelected ? (
                              <CheckCircle2 size={14} className="text-accent" />
                            ) : (
                              <Circle size={14} className="text-muted" />
                            )}
                          </div>
                          <div
                            className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-[9px] border border-border/10 shrink-0"
                            style={{ backgroundColor: `${acc.color || '#10b981'}15`, color: acc.color }}
                          >
                            {acc.type === 'credit' ? <CreditCard size={11} /> : <Wallet size={11} />}
                          </div>
                          <span className="text-[11px] font-bold text-primary truncate max-w-[130px]">{acc.name}</span>
                        </div>
                        <span className="font-premium-numbers font-bold text-[10px] text-secondary shrink-0">
                          {formatCurrency(acc.balance)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="h-[1px] bg-border/20" />

            {/* Section 2: Paycheck Day */}
            <div className="space-y-2.5">
              <label htmlFor="paycheck-select" className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Calendar size={14} className="text-accent" /> Jour récurrent de paye
              </label>
              <p className="text-[9px] text-muted leading-relaxed">
                Le Solde Plancher déduit les factures prévues entre aujourd'hui et votre prochaine paye. Configurez le jour ou laissez en automatique.
              </p>
              <div className="relative z-[9999]">
                <Select
                  id="paycheck-select"
                  value={paycheckDayConfig}
                  onChange={(e) => handlePaycheckDayChange(e.target.value)}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
                >
                  <option value="auto">Automatique (Détecter via les revenus)</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Le {day === 1 ? '1er' : day} du mois
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Sparkline — Projection 30 jours */}
        <div className="relative z-0">
          <div className="flex justify-between items-center mb-1 px-0.5">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Projection 30 jours</span>
            {hasRiskOfNegative && (
              <span className="text-[9px] font-bold text-danger flex items-center gap-0.5 animate-pulse">
                ⚠️ Zone négative détectée
              </span>
            )}
          </div>
          <div className="w-full h-[80px] select-none">
            {projectionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted text-xs">
                Aucune projection disponible.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 5, right: 2, left: 2, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorFloor" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isComfortable ? 'var(--accent)' : 'var(--danger)'}
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor={isComfortable ? 'var(--accent)' : 'var(--danger)'}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    ticks={[projectionData[0]?.date, projectionData[projectionData.length - 1]?.date]}
                    tickFormatter={(tick) => {
                      if (!tick) return '';
                      const d = new Date(tick);
                      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                    }}
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Solde projeté']}
                    labelFormatter={(lbl) =>
                      `Le : ${new Date(lbl).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    }
                    wrapperStyle={{ pointerEvents: 'none' }}
                    contentStyle={{
                      borderRadius: '16px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      padding: '8px 12px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={isComfortable ? 'var(--accent)' : 'var(--danger)'}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFloor)"
                  />
                  {hasRiskOfNegative && (
                    <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="3 3" strokeWidth={1.5} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Accordion — Échéances avant la paye */}
        <div className="relative z-0 border-t border-white/[0.04] pt-3">
          <button
            onClick={() => setIsAccordionExpanded(!isAccordionExpanded)}
            className="w-full flex justify-between items-center py-1.5 text-xs font-bold text-primary focus:outline-none"
            aria-expanded={isAccordionExpanded}
          >
            <span className="flex items-center gap-2">
              Échéances avant la paye
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-surface text-secondary border border-border/40 font-premium-numbers">
                {pendingRecurringExpenses.length}
              </span>
            </span>
            {isAccordionExpanded ? (
              <ChevronUp size={16} className="text-secondary" />
            ) : (
              <ChevronDown size={16} className="text-secondary" />
            )}
          </button>

          {isAccordionExpanded && (
            <div className="space-y-2 mt-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
              {pendingRecurringExpenses.length === 0 ? (
                <div className="text-center py-6 text-muted text-xs border border-dashed border-border/20 rounded-2xl bg-surface/10">
                  Aucune charge planifiée détectée d'ici la paye.
                </div>
              ) : (
                pendingRecurringExpenses.map((tx) => {
                  const isExcluded = excludedIds.includes(tx._id);
                  const catColor = tx.categoryId?.color || '#a1a1aa';
                  const catIcon = tx.categoryId?.icon || '🔁';

                  return (
                    <div
                      key={tx._id}
                      onClick={() => toggleExpenseExclusion(tx._id)}
                      className={`min-h-[48px] py-2.5 px-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                        isExcluded
                          ? 'bg-surface/20 border-border/20 opacity-50'
                          : 'bg-surface border-border/40 active:scale-[0.99] active:border-border/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1 text-secondary">
                          {isExcluded ? (
                            <CheckCircle2 size={18} className="text-accent" />
                          ) : (
                            <Circle size={18} className="text-muted" />
                          )}
                        </div>
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border border-border/10"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                        >
                          {catIcon}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate max-w-[130px] leading-tight ${
                            isExcluded ? 'line-through text-muted' : 'text-primary'
                          }`}>
                            {tx.description}
                          </p>
                          <p className="text-[9px] text-muted">
                            Le{' '}
                            {new Date(tx.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold font-premium-numbers shrink-0 ${
                        isExcluded ? 'text-muted' : 'text-primary'
                      }`}>
                        −{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FloorBalanceWidget;
