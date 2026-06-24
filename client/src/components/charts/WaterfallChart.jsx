import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, ReferenceLine } from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  HelpCircle,
  Info,
  TrendingUp,
  ArrowRight,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

const getMonthKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const parsePeriod = (periodKey) => {
  const [y, m] = periodKey.split('-').map(Number);
  return { year: y, month: m };
};

const getDateRange = (periodKey) => {
  const { year, month } = parsePeriod(periodKey);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const fmt = (d) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };
  return { startDate: fmt(startDate), endDate: fmt(endDate) };
};

const formatPeriodLabel = (periodKey) => {
  const { year, month } = parsePeriod(periodKey);
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const isCurrentMonth = (periodKey) => periodKey === getMonthKey();

const shiftMonth = (periodKey, delta) => {
  const { year, month } = parsePeriod(periodKey);
  const d = new Date(year, month - 1 + delta, 1);
  return getMonthKey(d);
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip text-left text-xs font-bold">
        <p className="opacity-70 uppercase text-[9px] tracking-wider font-extrabold mb-0.5">{data.name}</p>
        <p className="font-mono text-sm" style={{ color: data.color }}>
          {data.displayVal > 0 ? '+' : ''}{formatCurrency(data.displayVal)}
        </p>
      </div>
    );
  }
  return null;
};

const WaterfallChart = () => {
  const [period, setPeriod] = useState(getMonthKey());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(period);
      const res = await api.get(`/charts/waterfall?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrev = () => setPeriod(prev => shiftMonth(prev, -1));
  const handleNext = () => {
    if (!isCurrentMonth(period)) setPeriod(prev => shiftMonth(prev, 1));
  };

  const generateMonthGroups = () => {
    const groups = {};
    const current = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = d.getFullYear().toString();
      const key = getMonthKey(d);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
      if (!groups[year]) groups[year] = [];
      groups[year].push({ key, label: capitalized });
    }
    return groups;
  };

  // Process data for waterfall chart rendering
  const prepareWaterfallData = () => {
    if (!data) return { chartData: [], processedCats: [] };
    const chartData = [];
    const { totalIncome, totalExpenses, categories, netSavings } = data;

    // 1. Income (revenues) - block start at 0
    chartData.push({
      name: 'Revenus',
      displayVal: totalIncome,
      value: [0, totalIncome],
      color: '#10b981' // emerald-500
    });

    let currentAccumulator = totalIncome;

    // Group categories representing less than 5% of total expenses to keep graph readable
    const threshold = (totalExpenses || 0) * 0.05;
    const processedCats = [];
    let otherAmount = 0;

    categories.forEach(cat => {
      if (categories.length > 6 && cat.amount < threshold) {
        otherAmount += cat.amount;
      } else {
        processedCats.push(cat);
      }
    });

    if (otherAmount > 0) {
      processedCats.push({
        categoryId: 'others',
        name: 'Autres',
        icon: '📁',
        color: '#71717a',
        amount: otherAmount
      });
    }

    // 2. Add each category expense (decreases)
    processedCats.forEach(cat => {
      const nextAccumulator = currentAccumulator - cat.amount;
      chartData.push({
        name: cat.name,
        displayVal: -cat.amount,
        value: [nextAccumulator, currentAccumulator],
        color: cat.color || '#f43f5e' // rose-500
      });
      currentAccumulator = nextAccumulator;
    });

    // 3. Final Savings / Deficit block
    chartData.push({
      name: netSavings >= 0 ? 'Épargne Nette' : 'Déficit Net',
      displayVal: netSavings,
      value: [0, netSavings],
      color: netSavings >= 0 ? '#a855f7' : '#f43f5e' // purple-500 or rose-500
    });

    return { chartData, processedCats };
  };

  const { chartData, processedCats } = prepareWaterfallData();

  return (
    <div className="space-y-6">
      {/* ── 1. Month navigation ── */}
      <div className="flex items-center justify-between bg-surface-2-glass backdrop-blur-md p-1.5 rounded-2xl border border-border/40 shadow-sm will-change-transform" style={{ transform: 'translate3d(0, 0, 0)' }}>
        <button
          type="button"
          onClick={handlePrev}
          className="p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary hover:text-primary"
          title="Mois précédent"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={() => setIsMonthSheetOpen(true)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl hover:bg-surface/50 transition-all text-primary font-bold text-xs"
        >
          <Calendar size={14} className="text-accent" />
          <span>{formatPeriodLabel(period)}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={isCurrentMonth(period)}
          className={`p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary hover:text-primary ${
            isCurrentMonth(period) ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          title="Mois suivant"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── 2. KPI Cards ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 bg-surface-2 rounded-[22px] animate-pulse border border-border/30" />
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-3 gap-3">
          {/* Total Income */}
          <div className="bg-emerald-500/5 p-3.5 rounded-[22px] border border-emerald-500/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1">
              <ArrowUpRight size={10} className="text-emerald-400 shrink-0" />
              <p className="text-[8.5px] text-emerald-300 font-bold uppercase tracking-wider">Revenus</p>
            </div>
            <h4 className="text-sm font-extrabold text-emerald-400 mt-1 leading-tight font-mono">
              {formatCurrency(data.totalIncome)}
            </h4>
          </div>

          {/* Total Expenses */}
          <div className="bg-rose-500/5 p-3.5 rounded-[22px] border border-rose-500/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1">
              <ArrowDownRight size={10} className="text-rose-400 shrink-0" />
              <p className="text-[8.5px] text-rose-300 font-bold uppercase tracking-wider">Dépenses</p>
            </div>
            <h4 className="text-sm font-extrabold text-rose-400 mt-1 leading-tight font-mono">
              {formatCurrency(data.totalExpenses)}
            </h4>
          </div>

          {/* Net Savings */}
          <div className={`${data.netSavings >= 0 ? 'bg-purple-500/5 border-purple-500/20' : 'bg-red-500/5 border-red-500/20'} p-3.5 rounded-[22px] border shadow-sm flex flex-col justify-between`}>
            <div className="flex items-center gap-1">
              <Activity size={10} className={data.netSavings >= 0 ? 'text-purple-400' : 'text-red-400'} />
              <p className={`text-[8.5px] font-bold uppercase tracking-wider ${data.netSavings >= 0 ? 'text-purple-300' : 'text-red-300'}`}>
                {data.netSavings >= 0 ? 'Épargne' : 'Déficit'}
              </p>
            </div>
            <h4 className={`text-sm font-extrabold mt-1 leading-tight font-mono ${data.netSavings >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
              {formatCurrency(data.netSavings)}
            </h4>
          </div>
        </div>
      )}

      {/* ── 3. Waterfall Chart ── */}
      <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm flex flex-col items-center relative min-h-[320px]">
        <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase w-full text-center mb-1">
          Analyse mensuelle
        </h3>
        <p className="text-[9px] text-muted w-full text-center mb-4">
          Cascade d'allocation des revenus vers les dépenses
        </p>

        {loading ? (
          <div className="w-full h-60 flex items-end justify-between gap-4 pt-10 px-2">
            {[60, 40, 80, 55, 75].map((h, i) => (
              <div
                key={i}
                className="w-full rounded-t-lg shimmer-loader"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        ) : chartData.length <= 2 && data?.totalIncome === 0 && data?.totalExpenses === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[200px] text-center">
            <HelpCircle size={28} className="text-muted/60" />
            <p className="text-xs text-muted">Aucune transaction pour ce mois.</p>
          </div>
        ) : (
          <div className="w-full h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 8, fill: '#888', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#888' }}
                  tickFormatter={(val) => `${val} €`}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 4. Detailed categories list ── */}
      {!loading && processedCats && processedCats.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase px-1">
            Détail des flux
          </h3>
          <div className="bg-surface-2 rounded-[24px] border border-border/40 overflow-hidden divide-y divide-border/10 shadow-sm">
            {processedCats.map((cat, idx) => {
              const percentage = data.totalExpenses > 0
                ? parseFloat(((cat.amount / data.totalExpenses) * 100).toFixed(1))
                : 0;

              return (
                <div key={cat.categoryId || idx} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: `${cat.color || '#888'}15` }}
                    >
                      {cat.icon || '📁'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary truncate">{cat.name}</p>
                      <p className="text-[9px] text-muted">{percentage}% du total dépensé</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs font-black text-rose-400">-{formatCurrency(cat.amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. Explanation card ── */}
      {!loading && (
        <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-accent" />
            <h3 className="text-xs font-extrabold text-primary tracking-wider uppercase">Comment interpréter l'analyse ?</h3>
          </div>
          <div className="text-[10.5px] leading-relaxed text-secondary space-y-2.5">
            <p>
              Ce graphique en cascade décompose l'utilisation de vos ressources financières sur le mois sélectionné.
            </p>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
              <p>
                La colonne de départ <strong className="text-emerald-400">Revenus</strong> représente le montant total perçu au cours du mois.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
              <p>
                Les marches descendantes correspondent aux <strong className="text-rose-400">Dépenses</strong> par catégorie, ordonnées par importance. Elles réduisent progressivement le solde accumulé.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5" />
              <p>
                La colonne finale indique votre <strong className="text-purple-400">Épargne Nette</strong> (solde restant positif) ou votre <strong className="text-rose-400">Déficit Net</strong> (solde négatif).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Month Picker Bottom Sheet ── */}
      <BottomSheet isOpen={isMonthSheetOpen} onClose={() => setIsMonthSheetOpen(false)}>
        <div className="space-y-4">
          <div className="pb-2 border-b border-border/40">
            <h3 className="text-sm font-extrabold text-primary">Choisir un mois</h3>
            <p className="text-xs text-muted">Sélectionnez un mois à analyser</p>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar py-1">
            {Object.entries(generateMonthGroups()).map(([year, months]) => {
              const currentKey = getMonthKey();
              return (
                <div key={year} className="space-y-2">
                  <div className="text-[10px] font-black text-secondary/80 px-1 border-l-2 border-accent pl-2 mt-3 uppercase tracking-wider">
                    {year}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {months.map((m) => {
                      const isActive = period === m.key || (m.key === currentKey && period === getMonthKey());
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setPeriod(m.key);
                            setIsMonthSheetOpen(false);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                            isActive
                              ? 'bg-accent text-white shadow-sm'
                              : 'bg-surface-2 text-secondary hover:text-primary hover:bg-surface-2/80'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default WaterfallChart;
