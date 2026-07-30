import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ChevronRight, ChevronLeft, Calendar, HelpCircle, Sparkles, TrendingUp, AlertCircle, Award, ListOrdered, Tag, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';
import { motion, AnimatePresence } from 'framer-motion';
import AmountDisplay from '../ui/AmountDisplay';

const RankingChart = ({ period: externalPeriod, setPeriod: externalSetPeriod }) => {
  const [localPeriod, setLocalPeriod] = useState('month');
  const period = externalPeriod || localPeriod;
  const setPeriod = externalSetPeriod || setLocalPeriod;
  const [groupBy, setGroupBy] = useState('category'); // category, description (merchant)
  const [sortBy, setSortBy] = useState('amount'); // amount, count (frequency)
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ ranking: [], diffDays: 30, totalExpenses: 0 });
  const [expandedItem, setExpandedItem] = useState(null);
  const [mounted, setMounted] = useState(false);

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
    const format = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${format(start)} au ${format(end)}`;
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

  const fetchRankingData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDates(period);
      const res = await api.get(`/charts/ranking?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`);
      setData(res.data);
      setExpandedItem(null); // Reset accordion on data change
    } catch (err) {
      toast.error('Erreur lors du chargement du classement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankingData();
  }, [period, groupBy]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Sort dynamically in frontend if sorted by count
  const sortedRanking = [...(data.ranking || [])].sort((a, b) => {
    if (sortBy === 'count') return b.count - a.count;
    return b.amount - a.amount;
  });

  // Recharts Chart Data format
  const chartData = sortedRanking.map(item => ({
    name: item.name,
    amount: item.amount,
    count: item.count,
    color: item.color
  })).reverse(); // Reverse so rank #1 appears at the top of horizontal chart

  const handleItemClick = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* 1. Date Period Selectors */}
      <div className="space-y-4">
        {/* Toggle between Monthly and Cumulative views */}
        {!externalPeriod && (
          <>
            <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-xl w-full">
              <button
                type="button"
                onClick={() => { if (!isMonthly()) setPeriod('month'); }}
                className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                  isMonthly() ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary'
                }`}
              >
                Vue mensuelle
              </button>
              <button
                type="button"
                onClick={() => { if (isMonthly()) setPeriod('3months'); }}
                className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                  !isMonthly() ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-primary'
                }`}
              >
                Analyses cumulées
              </button>
            </div>

            {/* Period navigation */}
            {isMonthly() ? (
              <div className="flex items-center justify-between bg-surface-2-glass backdrop-blur-md p-1.5 rounded-2xl border border-border/40 shadow-sm will-change-transform" style={{ transform: 'translate3d(0, 0, 0)' }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary"
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
                  className={`p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary ${
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
              Période du {formatDateRange(getDates(period))}
            </div>
          </>
        )}

        {/* 2. Grouping & Sorting segment buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-surface-2/30 p-3 rounded-2xl border border-border/20">
          {/* GroupBy toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-muted tracking-wider">Grouper par</span>
            <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-xl w-48">
              <button
                type="button"
                onClick={() => setGroupBy('category')}
                className={`py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  groupBy === 'category' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
                }`}
              >
                <Tag size={10} /> Catégories
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('description')}
                className={`py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  groupBy === 'description' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
                }`}
              >
                <Store size={10} /> Commerçants
              </button>
            </div>
          </div>

          {/* SortBy toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-muted tracking-wider">Trier par</span>
            <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-xl w-44">
              <button
                type="button"
                onClick={() => setSortBy('amount')}
                className={`py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  sortBy === 'amount' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
                }`}
              >
                Montant
              </button>
              <button
                type="button"
                onClick={() => setSortBy('count')}
                className={`py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  sortBy === 'count' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
                }`}
              >
                Fréquence
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Ranking List (Unified mobile visualization) */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Visualisation du Classement</h3>
          <p className="text-[10px] text-muted">
            {sortBy === 'amount' ? 'Classement par volume total dépensé' : 'Classement par fréquence d\'achats.'}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4 py-10">
            <div className="h-16 bg-surface-2/80 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2/80 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2/80 rounded-2xl animate-pulse" />
          </div>
        ) : sortedRanking.length === 0 ? (
          <div className="text-center text-muted text-xs flex flex-col items-center justify-center gap-1.5 py-20">
            <HelpCircle size={24} className="text-muted/60" />
            <span>Aucune dépense trouvée sur cette période.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRanking.map((item, idx) => {
              const isExpanded = expandedItem === item.id;
              const totalExp = data.totalExpenses || 1;
              const pctOfTotal = ((item.amount / totalExp) * 100).toFixed(1);
              
              // Calculate width percentage relative to rank #1
              const maxVal = Math.max(...sortedRanking.map(r => sortBy === 'amount' ? r.amount : r.count));
              const currentVal = sortBy === 'amount' ? item.amount : item.count;
              const progressPct = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;

              return (
                <div 
                  key={item.id}
                  className="bg-surface rounded-[20px] border border-border/20 overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className="w-full p-4 flex flex-col text-left hover:bg-surface-2/40 transition-colors"
                  >
                    {/* Top Row: Info */}
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-black text-muted w-5 shrink-0 text-center">#{idx + 1}</span>
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-md shrink-0"
                          style={{ backgroundColor: `${item.color || '#f59e0b'}15` }}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-primary truncate leading-tight">{item.name}</h4>
                          <p className="text-[9px] text-muted font-bold mt-0.5 uppercase tracking-wide">
                            {pctOfTotal}% du budget • {item.count} achat{item.count > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div>
                          {sortBy === 'amount' ? (
                            <AmountDisplay amount={item.amount} type="expense" size="sm" />
                          ) : (
                            <span className="font-mono text-xs font-black text-primary block">
                              {item.count} ach.
                            </span>
                          )}
                          <div className="text-[8px] text-muted flex items-center gap-0.5 justify-end mt-0.5">
                            <span>Moy.</span>
                            <AmountDisplay amount={item.avgAmount} size="xs" type="neutral" />
                          </div>
                        </div>
                        <ChevronRight 
                          size={12} 
                          className={`text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90 text-accent' : ''}`} 
                        />
                      </div>
                    </div>

                    {/* Bottom Row: Premium Progress Bar */}
                    <div className="w-full pl-8 pr-5 mt-2.5">
                      <div className="w-full bg-border/20 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          style={{ 
                            backgroundColor: groupBy === 'category' ? (item.color || '#4ade80') : '#4ade80',
                            backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)'
                          }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Accordion Expand Area */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4.5 pt-1.5 border-t border-border/15 bg-surface/30 space-y-3.5 pl-12">
                          {/* Projection Banner */}
                          <div className="p-3 bg-accent/5 border border-accent/15 rounded-xl flex items-start gap-2.5">
                            <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="text-[8px] uppercase font-extrabold text-accent/80 tracking-wider">Projection sur 1 An (Effet Cumulé)</span>
                              <div className="text-[10.5px] text-primary leading-snug flex flex-wrap items-center gap-1">
                                <span>Si vous continuez ainsi, cette habitude vous coûtera</span>
                                <AmountDisplay amount={item.projectedAnnual} type="expense" size="xs" />
                                <span>par an.</span>
                              </div>
                            </div>
                          </div>

                          {/* Diagnostic / Tip */}
                          <div className="flex items-center gap-2 px-1">
                            {item.projectedAnnual > 1200 ? (
                              <>
                                <AlertCircle size={14} className="text-red-400 shrink-0" />
                                <span className="text-[9.5px] text-red-300 font-medium">
                                  Poste de dépense élevé à l'année. Essayez de réduire la récurrence ou le panier moyen.
                                </span>
                              </>
                            ) : item.projectedAnnual > 300 ? (
                              <>
                                <TrendingUp size={14} className="text-amber-400 shrink-0" />
                                <span className="text-[9.5px] text-amber-300 font-medium">
                                  Habitude modérée. Surveillez son évolution pour éviter qu'elle ne prenne trop d'ampleur.
                                </span>
                              </>
                            ) : (
                              <>
                                <Award size={14} className="text-emerald-400 shrink-0" />
                                <span className="text-[9.5px] text-emerald-300 font-medium">
                                  Dépense très bien maîtrisée. L'impact annuel reste parfaitement négligeable.
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer for Month Picker */}
      <BottomSheet
        isOpen={isMonthSheetOpen}
        onClose={() => setIsMonthSheetOpen(false)}
      >
        <div className="space-y-4">
          <div className="pb-2 border-b border-border/40">
            <h3 className="text-sm font-extrabold text-primary">Choisir un mois</h3>
            <p className="text-xs text-muted">Sélectionnez un mois spécifique à analyser</p>
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

export default RankingChart;
