import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Shuffle,
  Calendar,
  HelpCircle,
  Info,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';
import AmountDisplay from '../ui/AmountDisplay';

const FIXED_COLOR = '#818cf8';   // indigo-400 — charges fixes
const VARIABLE_COLOR = '#f59e0b'; // amber-400 — dépenses variables

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

// Reusable active-shape for the donut
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300 ease-out"
      />
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-component: Collapsible category list
// ─────────────────────────────────────────────────────────────
const CategoryList = ({ title, icon: Icon, iconBg, accentColor, categories, emptyLabel }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-surface-2 rounded-[24px] border border-border/40 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between transition-all select-none active:opacity-75"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon size={14} className={accentColor} />
          </div>
          <span className="text-xs font-extrabold text-primary">{title}</span>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${accentColor.replace('text-', '')}15`, color: 'inherit' }}
          >
            {categories.length} catégorie{categories.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-secondary" />
          : <ChevronDown size={14} className="text-secondary" />
        }
      </button>

      {open && (
        <div className="border-t border-border/20 divide-y divide-border/10 animate-in fade-in slide-in-from-top-1 duration-150">
          {categories.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-[10px] text-muted">{emptyLabel}</p>
            </div>
          ) : (
            categories.map((cat, idx) => (
              <div key={cat.categoryId || idx} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${cat.color || '#888'}18` }}
                  >
                    {cat.icon || '📁'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{cat.name}</p>
                    <p className="text-[9px] text-muted">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <AmountDisplay amount={cat.amount} type="expense" size="xs" />
                  <p className="text-[9px] text-muted">{cat.percentage}%</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">{payload[0].name}</p>
        <div className="mt-0.5">
          <AmountDisplay amount={payload[0].value} type="expense" size="xs" />
        </div>
      </div>
    );
  }
  return null;
};

const FixedVarChart = ({ period: externalPeriod, setPeriod: externalSetPeriod, isWidget = false, onViewDetail }) => {
  const [localPeriod, setLocalPeriod] = useState(getMonthKey());
  const rawPeriod = externalPeriod || localPeriod;
  const period = rawPeriod === 'month' ? getMonthKey() : rawPeriod;
  const setPeriod = externalSetPeriod || setLocalPeriod;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(period);
      const res = await api.get(`/charts/fixed-vs-variable?startDate=${startDate}&endDate=${endDate}`);
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

  // Donut data
  const pieData = data
    ? [
        { name: 'Charges fixes', value: data.totalFixed, color: FIXED_COLOR },
        { name: 'Dépenses variables', value: data.totalVariable, color: VARIABLE_COLOR }
      ].filter(d => d.value > 0)
    : [];

  // Month navigation
  const handlePrev = () => setPeriod(prev => shiftMonth(prev, -1));
  const handleNext = () => {
    if (!isCurrentMonth(period)) setPeriod(prev => shiftMonth(prev, 1));
  };

  // Month picker groups (last 18 months)
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

  // Hovered donut segment info
  const hoveredSlice = activeIndex !== null && pieData[activeIndex] ? pieData[activeIndex] : null;

  if (isWidget) {
    return (
      <div 
        onClick={onViewDetail}
        className="bg-surface-2 border border-border/40 rounded-[28px] p-5 shadow-sm hover:border-copper/30 active:scale-98 transition-all cursor-pointer select-none space-y-4 group relative overflow-hidden h-[256px] flex flex-col justify-between"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Lock size={16} />
            </div>
            <h3 className="text-xs font-extrabold text-primary group-hover:text-copper transition-colors">Fixes vs Variables</h3>
          </div>
          <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors" />
        </div>

        {loading || !data ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-copper/30 border-t-copper animate-spin" />
          </div>
        ) : pieData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-muted font-bold">
            Aucune donnée pour cette période
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 h-[150px]">
            {/* Donut à gauche */}
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Légende à droite */}
            <div className="w-1/2 space-y-4 text-left">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-secondary">
                  <div className="w-2.5 h-2.5 rounded-md bg-indigo-400" />
                  <span>Fixes</span>
                </div>
                <div className="ml-4">
                  <AmountDisplay amount={data.totalFixed} size="xs" type="expense" />
                </div>
                <p className="text-[8px] text-muted ml-4">
                  {data.fixedRatio}% des dépenses
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-secondary">
                  <div className="w-2.5 h-2.5 rounded-md bg-amber-400" />
                  <span>Variables</span>
                </div>
                <div className="ml-4">
                  <AmountDisplay amount={data.totalVariable} size="xs" type="expense" />
                </div>
                <p className="text-[8px] text-muted ml-4">
                  {data.variableRatio}% des dépenses
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!externalPeriod && (
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
      )}
      {/* ── 2. KPI Cards ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 bg-surface-2 rounded-[22px] animate-pulse border border-border/30" />
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-3 gap-3">
          {/* Total expenses */}
          <div className="bg-surface-2 p-3.5 rounded-[22px] border border-border/40 shadow-sm flex flex-col justify-between col-span-1">
            <p className="text-[8.5px] text-secondary font-bold uppercase tracking-wider">Total dépenses</p>
            <div className="mt-1">
                <AmountDisplay amount={data.totalExpenses} size="sm" type="expense" />
            </div>
          </div>

          {/* Fixed total */}
          <div className="bg-indigo-500/5 p-3.5 rounded-[22px] border border-indigo-500/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Lock size={10} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <p className="text-[8.5px] text-indigo-700 dark:text-indigo-300 font-extrabold uppercase tracking-wider">Fixes</p>
            </div>
            <div className="mt-1">
                <AmountDisplay amount={data.totalFixed} size="sm" type="expense" />
            </div>
            <p className="text-[8px] text-indigo-600 dark:text-indigo-400/70 font-bold mt-0.5">{data.fixedRatio}%</p>
          </div>

          {/* Variable total */}
          <div className="bg-amber-500/5 p-3.5 rounded-[22px] border border-amber-500/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Shuffle size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[8.5px] text-amber-700 dark:text-amber-300 font-extrabold uppercase tracking-wider">Variables</p>
            </div>
            <div className="mt-1">
                <AmountDisplay amount={data.totalVariable} size="sm" type="expense" />
            </div>
            <p className="text-[8px] text-amber-600 dark:text-amber-400/70 font-bold mt-0.5">{data.variableRatio}%</p>
          </div>
        </div>
      )}

      {/* ── 3. Donut Chart ── */}
      <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm flex flex-col items-center relative min-h-[290px]">
        <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase w-full text-center mb-1">
          Anatomie mensuelle des dépenses
        </h3>
        <p className="text-[9px] text-muted w-full text-center mb-4">
          Basé sur les transactions planifiées (🔒) vs manuelles (🎲)
        </p>

        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="w-10 h-10 border-4 border-indigo-400/15 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        ) : pieData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[180px] text-center">
            <HelpCircle size={28} className="text-muted/60" />
            <p className="text-xs text-muted">Aucune dépense pour ce mois.</p>
          </div>
        ) : (
          <>
            {/* Center overlay */}
            <div className="relative w-full h-52">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10">
                <span className="text-[9px] uppercase font-extrabold text-muted tracking-wider">
                  {hoveredSlice ? hoveredSlice.name : 'Total'}
                </span>
                <div className="mt-1">
                  <AmountDisplay amount={hoveredSlice ? hoveredSlice.value : (data?.totalExpenses || 0)} size="xl" type="expense" />
                </div>
                {hoveredSlice && (
                  <span
                    className="text-[9px] font-bold mt-0.5"
                    style={{ color: hoveredSlice.color }}
                  >
                    {hoveredSlice.value > 0 && data?.totalExpenses > 0
                      ? `${((hoveredSlice.value / data.totalExpenses) * 100).toFixed(1)}%`
                      : ''}
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={92}
                    paddingAngle={4}
                    dataKey="value"
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="cursor-pointer focus:outline-none"
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                        style={{ transition: 'opacity 0.2s ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ pointerEvents: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-5 mt-3 w-full">
              {[
                { label: 'Charges fixes', color: FIXED_COLOR, icon: Lock },
                { label: 'Dépenses variables', color: VARIABLE_COLOR, icon: Shuffle }
              ].map(({ label, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <Icon size={9} style={{ color }} />
                  <span className="text-[9px] font-bold text-secondary">{label}</span>
                </div>
              ))}
            </div>

            {/* Visual progress bar */}
            {data && data.totalExpenses > 0 && (
              <div className="w-full mt-4 space-y-1.5">
                <div className="flex justify-between text-[8px] font-bold text-muted">
                  <span>🔒 {data.fixedRatio}% fixes</span>
                  <span>{data.variableRatio}% variables 🎲</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden flex">
                  <div
                    className="h-full rounded-l-full transition-all duration-700"
                    style={{ width: `${data.fixedRatio}%`, background: FIXED_COLOR }}
                  />
                  <div
                    className="h-full rounded-r-full transition-all duration-700"
                    style={{ width: `${data.variableRatio}%`, background: VARIABLE_COLOR }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 4. Category breakdown lists ── */}
      {!loading && data && (
        <>
          <CategoryList
            title="Charges fixes"
            icon={Lock}
            iconBg="bg-indigo-500/10"
            accentColor="text-indigo-400"
            categories={data.fixedCategories || []}
            emptyLabel="Aucune charge fixe planifiée pour ce mois."
          />
          <CategoryList
            title="Dépenses variables"
            icon={Shuffle}
            iconBg="bg-amber-500/10"
            accentColor="text-amber-400"
            categories={data.variableCategories || []}
            emptyLabel="Aucune dépense variable pour ce mois."
          />
        </>
      )}

      {/* ── 5. Explanation card ── */}
      {!loading && (
        <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-indigo-400" />
            <h3 className="text-xs font-extrabold text-primary tracking-wider uppercase">Comment ça marche ?</h3>
          </div>
          <div className="text-[10.5px] leading-relaxed text-secondary space-y-2">
            <div className="flex items-start gap-2">
              <Lock size={11} className="text-indigo-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-primary">Charges fixes</strong> — Dépenses issues de vos{' '}
                <strong>transactions planifiées</strong> (loyer, abonnements, remboursements). Leur montant est prévisible d'un mois à l'autre.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Shuffle size={11} className="text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-primary">Dépenses variables</strong> — Toutes les dépenses saisies manuellement (courses, restaurants, loisirs). Elles fluctuent selon vos habitudes.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight size={11} className="text-muted shrink-0 mt-0.5" />
              <p className="text-muted">
                💡 Pour classer une dépense récurrente comme fixe, créez une{' '}
                <strong className="text-primary">Planification</strong> dans l'application.
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
                  <div className="text-[10px] font-black text-secondary/80 px-1 border-l-2 border-indigo-400 pl-2 mt-3 uppercase tracking-wider">
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
                              ? 'bg-indigo-500 text-white shadow-sm'
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

export default FixedVarChart;
