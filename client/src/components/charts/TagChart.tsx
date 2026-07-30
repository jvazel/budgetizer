import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTags } from '../../hooks/useTags';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector, AreaChart, Area, XAxis, BarChart, Bar, YAxis, ReferenceLine } from 'recharts';
import { ChevronRight, ChevronLeft, Calendar, HelpCircle, Target, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';
import Select from '../ui/Select';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

const CustomTooltip1 = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">{payload[0].name}</p>
        <p className="font-premium-numbers text-xs font-extrabold text-primary mt-0.5">
          {formatCurrency(payload[0].value || payload[0].amount)}
        </p>
      </div>
    );
  }
  return null;
};

const CustomTooltip2 = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formattedDate = new Date(label).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return (
      <div className="custom-chart-tooltip text-left space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Le : {formattedDate}</p>
        <div className="flex items-center justify-between gap-6 text-[11px] font-medium">
          <span className="text-secondary">Cumulé :</span>
          <span className="font-premium-numbers font-bold text-accent">
            {formatCurrency(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltip3 = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">{payload[0].name}</p>
        <p className="font-premium-numbers text-xs font-extrabold text-primary mt-0.5">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const TagChart = ({ period: externalPeriod, setPeriod: externalSetPeriod }) => {
  const [localPeriod, setLocalPeriod] = useState('month');
  const period = externalPeriod || localPeriod;
  const setPeriod = externalSetPeriod || setLocalPeriod;
  const [type, setType] = useState('expense'); // expense, income
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState('');
  const [budgetTargetInput, setBudgetTargetInput] = useState('');
  const [budgetTarget, setBudgetTarget] = useState(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tagsComparison: [], categoryBreakdown: [], cumulativeEvolution: [] });
  
  const { tags } = useTags();

  const [activeIndex, setActiveIndex] = useState(null);

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          className="transition-all duration-300 ease-out"
        />
      </g>
    );
  };

  const getDates = (p) => {
    if (/^\d{4}-\d{2}$/.test(p)) {
      const [year, month] = p.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const formatLocal = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      return {
        startDate: formatLocal(startDate),
        endDate: formatLocal(endDate)
      };
    }

    const end = new Date();
    const start = new Date();
    if (p === 'month') {
      start.setDate(1);
    } else if (p === '3months') {
      start.setMonth(start.getMonth() - 3);
    } else if (p === '6months') {
      start.setMonth(start.getMonth() - 6);
    } else if (p === 'year') {
      start.setMonth(0);
      start.setDate(1);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const formatPeriodLabel = (p) => {
    if (p === 'month') return 'Ce mois';
    if (p === '3months') return '3 mois';
    if (p === '6months') return '6 mois';
    if (p === 'year') return 'Cette année';
    if (/^\d{4}-\d{2}$/.test(p)) {
      const [year, month] = p.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      const formatted = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return p;
  };

  const isMonthly = () => period === 'month' || /^\d{4}-\d{2}$/.test(period);

  const isCurrentMonth = () => {
    if (period === 'month') return true;
    const currentD = new Date();
    const currentKey = `${currentD.getFullYear()}-${String(currentD.getMonth() + 1).padStart(2, '0')}`;
    return period === currentKey;
  };

  const handlePrevMonth = () => {
    let year, month;
    if (period === 'month') {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    } else if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, m] = period.split('-').map(Number);
      year = y;
      month = m;
    } else {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }

    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
    const newPeriod = `${year}-${String(month).padStart(2, '0')}`;
    setPeriod(newPeriod);
  };

  const handleNextMonth = () => {
    if (isCurrentMonth()) return;
    let year, month;
    if (period === 'month') {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    } else if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, m] = period.split('-').map(Number);
      year = y;
      month = m;
    } else {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    const newPeriod = `${year}-${String(month).padStart(2, '0')}`;
    const currentD = new Date();
    const currentKey = `${currentD.getFullYear()}-${String(currentD.getMonth() + 1).padStart(2, '0')}`;
    if (newPeriod === currentKey) {
      setPeriod('month');
    } else {
      setPeriod(newPeriod);
    }
  };

  const formatDateRange = ({ startDate, endDate }) => {
    const parse = (str) => {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const start = parse(startDate);
    const end = parse(endDate);
    const format = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `du ${format(start)} au ${format(end)}`;
  };

  const generateRecentMonthsGrouped = () => {
    const groups = {};
    const current = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = d.getFullYear().toString();
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push({ key, label: capitalizedLabel });
    }
    return groups;
  };

  const fetchTagChartData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDates(period);
      const tagParam = selectedTagId ? `&tagId=${selectedTagId}` : '';
      const res = await api.get(`/charts/tags?startDate=${startDate}&endDate=${endDate}&type=${type}${tagParam}`);
      setData(res.data);
      setActiveIndex(null);
    } catch (err) {
      toast.error('Erreur lors du chargement des graphiques de tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTagChartData();
  }, [period, type, selectedTagId]);

  const handleApplyBudget = (e) => {
    e.preventDefault();
    const val = parseFloat(budgetTargetInput);
    if (!isNaN(val) && val > 0) {
      setBudgetTarget(val);
    } else {
      setBudgetTarget(null);
    }
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const currentTag = tags.find(t => t._id === selectedTagId);
  const selectedTagTotal = data.cumulativeEvolution.length > 0 
    ? data.cumulativeEvolution[data.cumulativeEvolution.length - 1].cumulative 
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. Date and Type Selectors */}
      {!externalPeriod && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-xl w-full">
            <button
              type="button"
              onClick={() => !isMonthly() && setPeriod('month')}
              className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                isMonthly() ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              Vue mensuelle
            </button>
            <button
              type="button"
              onClick={() => isMonthly() && setPeriod('3months')}
              className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                !isMonthly() ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              Analyses cumulées
            </button>
          </div>

          {isMonthly() ? (
            <div className="flex items-center justify-between bg-surface-2-glass backdrop-blur-md p-1.5 rounded-2xl border border-border/40 shadow-sm will-change-transform" style={{ transform: 'translate3d(0, 0, 0)' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary hover:text-primary"
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
                onClick={handleNextMonth}
                disabled={isCurrentMonth()}
                className={`p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary hover:text-primary ${
                  isCurrentMonth() ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '3months', label: '3 mois' },
                { id: '6months', label: '6 mois' },
                { id: 'year', label: 'Cette année' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                    period === p.id 
                      ? 'bg-accent text-white shadow-sm' 
                      : 'bg-surface-2 text-secondary hover:text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="text-[10px] text-muted text-center font-medium opacity-85">
            Période {formatDateRange(getDates(period))}
          </div>
        </div>
      )}

        {/* Tag Selector & Flow Type */}
        <div className="flex gap-3 items-center justify-between">
          <Select
            value={selectedTagId}
            onChange={(e) => {
              setSelectedTagId(e.target.value);
              setBudgetTarget(null);
              setBudgetTargetInput('');
            }}
            className="flex-1 max-w-[55%] bg-surface-2 border border-border/40 px-3.5 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
          >
            <option value="">-- Tous les tags --</option>
            {tags.map(tag => (
              <option key={tag._id} value={tag._id}>{tag.name}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-0.5 bg-surface-2 p-0.5 rounded-xl w-36">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-1.5 rounded-lg text-[10px] font-bold transition-all text-center ${
                type === 'expense' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
              }`}
            >
              Dépenses
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-1.5 rounded-lg text-[10px] font-bold transition-all text-center ${
                type === 'income' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
              }`}
            >
              Revenus
            </button>
          </div>
        </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-56 bg-surface-2 rounded-3xl animate-pulse" />
          <div className="h-44 bg-surface-2 rounded-3xl animate-pulse" />
        </div>
      ) : selectedTagId ? (
        /* ================= TAG DRILLDOWN VIEWS ================= */
        <div className="space-y-6">
          {/* A. Tag Category Breakdowns (Donut Chart) */}
          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm flex flex-col items-center min-h-[280px]">
            <div className="w-full text-left mb-2">
              <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Répartition par catégorie</h3>
              <p className="text-[10px] text-muted">Distribution des transactions portant l'étiquette "#{currentTag?.name}".</p>
            </div>

            <div className="w-full h-48 relative flex items-center justify-center">
              {data.categoryBreakdown.length === 0 ? (
                <div className="text-center text-muted text-xs space-y-1 py-10">
                  <HelpCircle size={24} className="mx-auto opacity-60" />
                  <p>Aucune transaction catégorisée pour ce tag.</p>
                </div>
              ) : (
                <>
                  <div className="absolute text-center space-y-0.5 pointer-events-none flex flex-col items-center justify-center w-[110px] select-none">
                    <span className="text-[9px] uppercase font-extrabold text-muted tracking-wider truncate max-w-full">
                      {activeIndex !== null && data.categoryBreakdown[activeIndex]
                        ? data.categoryBreakdown[activeIndex].name
                        : 'Total'}
                    </span>
                    <p className="font-mono text-base font-black text-primary truncate max-w-full leading-none mt-0.5">
                      {formatCurrency(
                        activeIndex !== null && data.categoryBreakdown[activeIndex]
                          ? data.categoryBreakdown[activeIndex].value || data.categoryBreakdown[activeIndex].amount
                          : selectedTagTotal
                      )}
                    </p>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="amount"
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                      >
                        {data.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<CustomTooltip1 />} 
                        wrapperStyle={{ pointerEvents: 'none' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* List breakdown values below donut */}
            {data.categoryBreakdown.length > 0 && (
              <div className="w-full space-y-2 mt-4 pt-3 border-t border-border/20">
                {data.categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="font-bold text-secondary">{cat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-primary">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. Cumulative evolution area chart */}
          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Évolution Cumulative</h3>
                <p className="text-[10px] text-muted">Progression chronologique des dépenses du projet.</p>
              </div>
              <span className="font-mono text-sm font-black text-accent">{formatCurrency(selectedTagTotal)}</span>
            </div>

            <div className="w-full h-44 flex items-center justify-center">
              {data.cumulativeEvolution.length === 0 ? (
                <div className="text-center text-muted text-xs">Aucune évolution disponible.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.cumulativeEvolution}>
                    <defs>
                      <linearGradient id="tagGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={currentTag?.color || '#3b82f6'} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={currentTag?.color || '#3b82f6'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDateLabel}
                      tick={{ fontSize: 9, fill: '#888' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      content={<CustomTooltip2 />}
                      wrapperStyle={{ pointerEvents: 'none' }}
                     />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke={currentTag?.color || '#3b82f6'} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#tagGlow)" 
                    />
                    {budgetTarget && (
                      <ReferenceLine 
                        y={budgetTarget} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        label={{
                          value: `Seuil: ${budgetTarget} €`,
                          fill: '#ef4444',
                          fontSize: 9,
                          fontWeight: 'bold',
                          position: 'top'
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Target budget inline form */}
            <form onSubmit={handleApplyBudget} className="flex gap-2 items-center pt-2 border-t border-border/20">
              <div className="flex-1 relative flex items-center bg-surface border border-border px-3.5 py-2 rounded-xl">
                <Target size={14} className="text-secondary shrink-0 mr-2" />
                <input
                  type="number"
                  placeholder="Budget cible (seuil max)..."
                  value={budgetTargetInput}
                  onChange={(e) => setBudgetTargetInput(e.target.value)}
                  className="w-full bg-transparent text-xs text-primary focus:outline-none focus:border-none placeholder-muted font-bold"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-3 rounded-xl bg-accent text-white text-xs font-bold active:scale-95 transition-all shadow-sm shadow-accent/20"
              >
                Appliquer
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ================= GENERAL COMPARISON VIEW ================= */
        <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Comparaison des Tags</h3>
            <p className="text-[10px] text-muted">Volume d'argent par étiquette active sur la période sélectionnée.</p>
          </div>

          <div className="w-full h-60 flex items-center justify-center">
            {data.tagsComparison.length === 0 ? (
              <div className="text-center text-muted text-xs space-y-1">
                <HelpCircle size={28} className="mx-auto opacity-60" />
                <p>Aucun tag actif avec des transactions sur cette période.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.tagsComparison}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 9, fill: '#aaa', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip 
                    content={<CustomTooltip3 />}
                    wrapperStyle={{ pointerEvents: 'none' }}
                   />
                  <Bar 
                    dataKey="amount" 
                    radius={[0, 6, 6, 0]}
                    fillOpacity={0.8}
                  >
                    {data.tagsComparison.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Month picker sheet */}
      <BottomSheet isOpen={isMonthSheetOpen} onClose={() => setIsMonthSheetOpen(false)}>
        <div className="space-y-4">
          <div className="pb-2 border-b border-border/40">
            <h3 className="text-sm font-extrabold text-primary">Choisir un mois</h3>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar py-1">
            {Object.entries(generateRecentMonthsGrouped()).map(([year, months]) => {
              const currentD = new Date();
              const currentKey = `${currentD.getFullYear()}-${String(currentD.getMonth() + 1).padStart(2, '0')}`;
              
              return (
                <div key={year} className="space-y-2">
                  <div className="text-[10px] font-black text-secondary/80 px-1 border-l-2 border-accent pl-2 mt-3 uppercase tracking-wider">{year}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {months.map((m) => {
                      const isActive = period === m.key || (m.key === currentKey && period === 'month');
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            if (m.key === currentKey) {
                              setPeriod('month');
                            } else {
                              setPeriod(m.key);
                            }
                            setIsMonthSheetOpen(false);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                            isActive ? 'bg-accent text-white shadow-sm' : 'bg-surface-2 text-secondary hover:text-primary hover:bg-surface-2/80'
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

export default TagChart;
