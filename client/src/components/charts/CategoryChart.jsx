import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { ChevronRight, ChevronLeft, ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, HelpCircle, Calendar, X, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';

const CategoryChart = () => {
  const [period, setPeriod] = useState('month'); // month, 3months, 6months, year
  const [type, setType] = useState('expense'); // expense, income
  const [compareMode, setCompareMode] = useState('previous'); // previous, 3m, 6m, none
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);
  const [isCompareSheetOpen, setIsCompareSheetOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ total: 0, categories: [] });
  
  // Drill-down states
  const [selectedCategory, setSelectedCategory] = useState(null);
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

  // Detail Bottom Sheet states
  const [detailSheet, setDetailSheet] = useState({ isOpen: false, category: null });
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [categoryTransactionsLoading, setCategoryTransactionsLoading] = useState(false);
  
  // Transaction list bottom sheet states
  const [transactionListSheet, setTransactionListSheet] = useState({ isOpen: false, subcatName: null, txs: [] });
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  const getCompareValue = (cat) => {
    if (compareMode === 'previous') return cat.changeVsPreviousPeriod || 0;
    if (compareMode === '3m') return cat.changeVs3MAvg || 0;
    if (compareMode === '6m') return cat.changeVs6MAvg || 0;
    return 0;
  };

  const getCompareDiff = (cat) => {
    if (compareMode === 'previous') {
      const prevAmount = cat.prevAmount || 0;
      return cat.amount - prevAmount;
    }
    if (compareMode === '3m') {
      const avg = cat.movingAvg3M || 0;
      return cat.amount - avg;
    }
    if (compareMode === '6m') {
      const avg = cat.movingAvg6M || 0;
      return cat.amount - avg;
    }
    return 0;
  };

  const formatCompareText = (cat) => {
    const pct = getCompareValue(cat);
    const diff = getCompareDiff(cat);
    
    if (compareMode === 'previous' && pct === 100 && (cat.prevAmount || 0) === 0) {
      return 'Nouveau';
    }
    if (compareMode === '3m' && pct === 100 && (cat.movingAvg3M || 0) === 0) {
      return 'Nouveau';
    }
    if (compareMode === '6m' && pct === 100 && (cat.movingAvg6M || 0) === 0) {
      return 'Nouveau';
    }

    const formattedDiff = formatCurrency(Math.abs(diff));
    const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
    return `${sign}${formattedDiff} (${pct > 0 ? '+' : ''}${pct}%)`;
  };

  const getCompareColorClass = (cat) => {
    const diff = getCompareDiff(cat);
    if (diff === 0) return 'text-muted';
    if (type === 'expense') {
      return diff > 0 ? 'text-danger' : 'text-accent';
    } else {
      return diff > 0 ? 'text-accent' : 'text-danger';
    }
  };

  const handleOpenDetailSheet = async (cat) => {
    setDetailSheet({ isOpen: true, category: cat });
    setCategoryTransactions([]);
    try {
      setCategoryTransactionsLoading(true);
      const { startDate, endDate } = getDates(period);
      const res = await api.get(`/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`);
      const list = res.data.transactions || res.data || [];
      const filtered = list.filter(
        tx => {
          if (cat.categoryId === 'others') {
            return cat.subcategories.some(sub => tx.categoryId?.name === sub.name) && tx.type === type;
          }
          return (tx.categoryId?._id === cat.categoryId || tx.categoryId?.name === cat.name) && tx.type === type;
        }
      );
      setCategoryTransactions(filtered);
    } catch (err) {
      toast.error('Impossible de charger les transactions');
    } finally {
      setCategoryTransactionsLoading(false);
    }
  };

  const getDates = (p) => {
    if (/^\d{4}-\d{2}$/.test(p)) {
      const [year, month] = p.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // last day of that month
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

  const getPeriodText = (p) => {
    if (p === 'month') return 'ce mois-ci';
    if (p === '3months') return 'ces 3 derniers mois';
    if (p === '6months') return 'ces 6 derniers mois';
    if (p === 'year') return 'cette année';
    if (/^\d{4}-\d{2}$/.test(p)) {
      const [year, month] = p.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'long' });
      return `en ${monthName} ${year}`;
    }
    return '';
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

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDates(period);
      const res = await api.get(`/charts/by-category?startDate=${startDate}&endDate=${endDate}&type=${type}`);
      setData(res.data);
      setSelectedCategory(null); // Reset drilldown on fetch
      setActiveIndex(null);
    } catch (err) {
      toast.error('Erreur lors du chargement des graphiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [period, type]);

  const handleSliceClick = (entry) => {
    setActiveIndex(null);
    if (!selectedCategory) {
      // Find exact category object
      const cat = data.categories.find(c => c.name === entry.name);
      if (cat && cat.subcategories && cat.subcategories.length > 0) {
        setSelectedCategory(cat);
      }
    }
  };

  const handleSubcategoryClick = async (subcatName) => {
    try {
      const { startDate, endDate } = getDates(period);
      // Fetch all transactions in period for this user
      const res = await api.get(`/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`);
      const list = res.data.transactions || res.data || [];
      // Filter by subcategory name
      const filtered = list.filter(tx => tx.categoryId?.name === subcatName && tx.type === type);
      setTransactionListSheet({
        isOpen: true,
        subcatName,
        txs: filtered
      });
    } catch (error) {
      toast.error('Impossible de charger les transactions');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Aggregate small categories (< 5%) under "Autres" to keep charts clean and readable
  const processedCategories = React.useMemo(() => {
    if (!data.categories || data.categories.length === 0) return [];
    
    // If <= 6 categories, don't aggregate
    if (data.categories.length <= 6) return data.categories;

    const threshold = data.total * 0.05; // 5% of total
    const mainCategories = [];
    let otherAmount = 0;
    const otherSubcategories = [];

    data.categories.forEach(cat => {
      if (cat.amount < threshold) {
        otherAmount += cat.amount;
        if (cat.subcategories && cat.subcategories.length > 0) {
          otherSubcategories.push(...cat.subcategories);
        } else {
          otherSubcategories.push({
            name: cat.name,
            amount: cat.amount,
            icon: cat.icon || '📁',
            color: cat.color || '#71717a',
            percentage: data.total > 0 ? parseFloat(((cat.amount / data.total) * 100).toFixed(1)) : 0
          });
        }
      } else {
        mainCategories.push(cat);
      }
    });

    if (otherAmount > 0) {
      // Sort subcategories of Autres by amount
      otherSubcategories.sort((a, b) => b.amount - a.amount);
      const totalOtherSubAmount = otherSubcategories.reduce((sum, s) => sum + s.amount, 0) || 1;
      const otherSubWithPct = otherSubcategories.map(s => ({
        ...s,
        percentage: parseFloat(((s.amount / totalOtherSubAmount) * 100).toFixed(1))
      }));

      mainCategories.push({
        categoryId: 'others',
        name: 'Autres',
        icon: '📁',
        color: '#71717a',
        amount: otherAmount,
        percentage: data.total > 0 ? parseFloat(((otherAmount / data.total) * 100).toFixed(1)) : 0,
        subcategories: otherSubWithPct
      });
    }

    return mainCategories.sort((a, b) => b.amount - a.amount);
  }, [data.categories, data.total]);

  // Determine what list & pie data to show (drilldown vs normal)
  const pieData = selectedCategory
    ? selectedCategory.subcategories.map(sub => ({
        name: sub.name,
        value: sub.amount,
        color: selectedCategory.color || '#3b82f6'
      }))
    : processedCategories.map(cat => ({
        name: cat.name,
        value: cat.amount,
        color: cat.color || '#10b981'
      }));

  const visibleLegendItems = isLegendExpanded ? pieData : pieData.slice(0, 4);
  const hasMoreLegendItems = pieData.length > 4;
  const hiddenLegendCount = pieData.length - 4;

  const CustomTooltip = ({ active, payload }) => {
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

  return (
    <div className="space-y-6">
      {/* 1. Selectors */}
      <div className="space-y-4">
        {/* Toggle between Monthly and Cumulative views */}
        <div className="grid grid-cols-2 gap-1 bg-surface-2-glass backdrop-blur-md p-1 rounded-xl w-full border border-border/40">
          <button
            type="button"
            onClick={() => {
              if (!isMonthly()) {
                setPeriod('month');
              }
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
              isMonthly() ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Vue mensuelle
          </button>
          <button
            type="button"
            onClick={() => {
              if (isMonthly()) {
                setPeriod('3months');
              }
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
              !isMonthly() ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Analyses cumulées
          </button>
        </div>

        {/* Period navigation or choices */}
        <div className="min-h-[48px] flex flex-col justify-center">
          {isMonthly() ? (
            <div className="flex items-center justify-between bg-surface-2-glass backdrop-blur-md p-1.5 rounded-2xl border border-border/40 shadow-sm will-change-transform" style={{ transform: 'translate3d(0, 0, 0)' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
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
                onClick={handleNextMonth}
                disabled={isCurrentMonth()}
                className={`p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary hover:text-primary ${
                  isCurrentMonth() ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                title="Mois suivant"
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
                      ? 'bg-copper text-white shadow-sm font-extrabold' 
                      : 'bg-surface-2-glass text-secondary hover:text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exact date range helper text */}
        <div className="text-[10px] text-muted text-center font-medium opacity-85">
          Période du {formatDateRange(getDates(period))}
        </div>

        {/* Toggle expense/income & comparison */}
        <div className="flex justify-between items-center gap-4">
          <div className="grid grid-cols-2 gap-1 bg-surface-2-glass backdrop-blur-md p-1 rounded-xl w-48 border border-border/40">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'expense' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Dépenses
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'income' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              Revenus
            </button>
          </div>

          {/* Trigger button for comparison selection bottom sheet */}
          <button
            type="button"
            onClick={() => setIsCompareSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2-glass border border-border/40 hover:bg-surface-2/80 active:scale-98 transition-all text-xs font-bold text-secondary"
          >
            <TrendingUp size={12} className="text-accent" />
            <span>
              {compareMode === 'previous' && 'Vs préc.'}
              {compareMode === '3m' && 'Vs moy. 3M'}
              {compareMode === '6m' && 'Vs moy. 6M'}
              {compareMode === 'none' && 'Sans comp.'}
            </span>
            <span className="text-[10px] opacity-60">▼</span>
          </button>
        </div>
      </div>

      {/* 2. Donut Chart Box */}
      <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm flex flex-col items-center relative min-h-[300px]">
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="absolute top-4 left-4 text-xs font-bold text-accent flex items-center gap-1 bg-surface px-3 py-1.5 rounded-xl border border-border/40 shadow-sm active:scale-95 transition-transform"
          >
            <ArrowLeft size={14} /> Toutes
          </button>
        )}

        <div className="w-full h-56 relative flex items-center justify-center">
          {loading ? (
            <div className="w-36 h-36 rounded-full border-[12px] border-surface-2 shimmer-loader" />
          ) : pieData.length === 0 ? (
            <div className="text-center text-muted text-xs space-y-1">
              <HelpCircle size={28} className="mx-auto opacity-60" />
              <p>Aucune transaction sur cette période.</p>
            </div>
          ) : (
            <>
              {/* Overlay center info */}
              <div className="absolute text-center space-y-0.5 pointer-events-none flex flex-col items-center justify-center w-[120px] select-none">
                <span className="text-[9px] uppercase font-extrabold text-muted tracking-wider truncate max-w-full">
                  {activeIndex !== null && pieData[activeIndex]
                    ? pieData[activeIndex].name
                    : (selectedCategory ? selectedCategory.name : 'Total')}
                </span>
                <p className="font-premium-numbers text-lg font-black text-primary truncate max-w-full leading-none mt-0.5">
                  {formatCurrency(
                    activeIndex !== null && pieData[activeIndex]
                      ? pieData[activeIndex].value
                      : (selectedCategory ? selectedCategory.amount : data.total)
                  )}
                </p>
                {activeIndex !== null && pieData[activeIndex] && (
                  <span className="text-[9px] text-accent font-bold block mt-0.5">
                    {`${((pieData[activeIndex].value / (selectedCategory ? selectedCategory.amount : data.total || 1)) * 100).toFixed(1)}%`}
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={handleSliceClick}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer focus:outline-none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<CustomTooltip />} 
                    wrapperStyle={{ pointerEvents: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Dynamic Interactive Legend */}
        {pieData.length > 0 && (
          <div className="w-full mt-4 pt-4 border-t border-border/30 z-10 animate-fadeIn">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {visibleLegendItems.map((item, index) => {
                const totalVal = selectedCategory ? selectedCategory.amount : data.total || 1;
                const pct = ((item.value / totalVal) * 100).toFixed(1);
                const isHovered = activeIndex === index;
                
                return (
                  <div 
                    key={index}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all select-none cursor-pointer ${
                      isHovered ? 'bg-surface border border-border/40 shadow-sm scale-[1.01]' : 'border border-transparent hover:bg-surface/30'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={() => {
                      handleSliceClick(item);
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-bold text-primary truncate flex-1">{item.name}</span>
                    <span className="text-[10px] font-bold text-secondary font-premium-numbers shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
            {hasMoreLegendItems && (
              <button
                type="button"
                onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                className="w-full text-center mt-3 text-[10px] font-black text-[#d97706] uppercase tracking-wider hover:underline focus:outline-none py-1.5 rounded-xl hover:bg-surface/30 active:scale-95 transition-all"
              >
                {isLegendExpanded ? 'Voir moins ▲' : `+ ${hiddenLegendCount} autres ▼`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Categories/Subcategories List */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase px-1">
          {selectedCategory ? `Détail : ${selectedCategory.name}` : 'Répartition'}
        </h3>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-surface-2 rounded-2xl shimmer-loader" />
            <div className="h-16 bg-surface-2 rounded-2xl shimmer-loader" />
          </div>
        ) : pieData.length === 0 ? (
          null
        ) : selectedCategory ? (
          /* Subcategories List */
          <div className="space-y-2">
            {selectedCategory.subcategories.map((sub, idx) => (
              <button
                key={idx}
                onClick={() => handleSubcategoryClick(sub.name)}
                className="w-full bg-surface-2 p-3.5 rounded-[24px] border border-border/40 flex items-center justify-between hover:bg-surface/30 active:scale-99 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-surface-2/60 border border-border/40 shrink-0">
                    {sub.icon || '📁'}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-primary leading-snug">{sub.name}</h4>
                    <p className="text-[10px] text-muted">{sub.percentage}% de {selectedCategory.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-premium-numbers text-xs sm:text-sm font-bold text-primary">{formatCurrency(sub.amount)}</span>
                  <ChevronRight size={16} className="text-muted shrink-0" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Main Categories List */
          <div className="space-y-2">
            {processedCategories.map((cat, idx) => (
              <div 
                key={idx}
                onClick={() => cat.subcategories?.length > 0 ? setSelectedCategory(cat) : handleOpenDetailSheet(cat)}
                className="w-full bg-surface-2 p-3.5 rounded-[24px] border border-border/40 flex items-center justify-between hover:bg-surface/30 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ 
                      backgroundColor: `${cat.color || '#888'}1f`,
                      border: `1px solid ${cat.color || '#888'}25`
                    }}
                  >
                    {cat.icon || '📁'}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-primary leading-snug">{cat.name}</h4>
                    <p className="text-[10px] text-muted">{cat.percentage}% du total</p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="font-premium-numbers text-xs sm:text-sm font-bold text-primary block">{formatCurrency(cat.amount)}</span>
                    
                    {compareMode !== 'none' && (
                      <span className={`text-[9px] font-bold flex items-center justify-end gap-0.5 ${getCompareColorClass(cat)}`}>
                        {getCompareDiff(cat) > 0 ? (
                          <ArrowUpRight size={10} />
                        ) : getCompareDiff(cat) < 0 ? (
                          <ArrowDownRight size={10} />
                        ) : (
                          <Minus size={10} />
                        )}
                        {formatCompareText(cat)}
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetailSheet(cat);
                    }}
                    className="p-1.5 rounded-lg bg-surface hover:bg-border/30 transition-colors text-accent flex items-center justify-center active:scale-95"
                    title="Voir les tendances"
                  >
                    <TrendingUp size={14} />
                  </button>

                  {cat.subcategories?.length > 0 && <ChevronRight size={16} className="text-muted shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction List Sheet (Drill-down level 2) */}
      {transactionListSheet.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="flex-1" onClick={() => setTransactionListSheet({ isOpen: false, subcatName: null, txs: [] })} />
          <div className="bg-surface rounded-t-[32px] max-h-[70vh] overflow-y-auto w-full max-w-md mx-auto p-6 shadow-2xl border-t border-border flex flex-col space-y-4 no-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <div>
                <h3 className="text-sm font-extrabold text-primary">{transactionListSheet.subcatName}</h3>
                <p className="text-xs text-muted">{transactionListSheet.txs.length} transaction(s)</p>
              </div>
              <button 
                onClick={() => setTransactionListSheet({ isOpen: false, subcatName: null, txs: [] })} 
                className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors active:scale-90"
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 overflow-y-auto">
              {transactionListSheet.txs.length === 0 ? (
                <p className="text-center text-xs text-muted py-6">Aucune transaction trouvée.</p>
              ) : (
                transactionListSheet.txs.map(tx => (
                  <div key={tx._id} className="bg-surface-2 p-3.5 rounded-2xl border border-border/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-primary">{tx.note || tx.description || 'Sans note'}</p>
                      <p className="text-[9px] text-muted flex items-center gap-1 mt-0.5">
                        <Calendar size={10} /> {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {tx.accountId?.name && (
                          <>
                            <span className="opacity-60">•</span>
                            <span className="inline-flex items-center gap-1 font-bold text-secondary">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                              {tx.accountId?.name}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="font-premium-numbers text-xs font-extrabold text-primary shrink-0 pl-1">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* Custom Month Picker Bottom Sheet */}
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

      {/* Comparison Selector Bottom Sheet */}
      <BottomSheet
        isOpen={isCompareSheetOpen}
        onClose={() => setIsCompareSheetOpen(false)}
      >
        <div className="space-y-4">
          <div className="pb-2 border-b border-border/40">
            <h3 className="text-sm font-extrabold text-primary">Comparer les catégories</h3>
            <p className="text-xs text-muted">Choisissez une période de référence pour analyser l'évolution de vos dépenses et revenus</p>
          </div>

          <div className="space-y-2">
            {[
              { id: 'previous', label: 'Période précédente', desc: 'Compare avec la même durée juste avant celle choisie' },
              { id: '3m', label: 'Moyenne sur 3 mois', desc: 'Compare avec la moyenne mensuelle des 3 derniers mois' },
              { id: '6m', label: 'Moyenne sur 6 mois', desc: 'Compare avec la moyenne mensuelle des 6 derniers mois' },
              { id: 'none', label: 'Aucune comparaison', desc: 'Affiche uniquement les montants réels' }
            ].map((m) => {
              const isActive = compareMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setCompareMode(m.id);
                    setIsCompareSheetOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left flex flex-col transition-all ${
                    isActive
                      ? 'bg-accent/10 border-accent text-primary shadow-sm'
                      : 'bg-surface-2 border-border/40 text-secondary hover:bg-surface-2/80 hover:text-primary'
                  }`}
                >
                  <span className="text-xs font-bold">{m.label}</span>
                  <span className="text-[10px] text-muted font-normal mt-0.5">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Category Details & Trends Bottom Sheet */}
      <BottomSheet
        isOpen={detailSheet.isOpen}
        onClose={() => {
          setDetailSheet({ isOpen: false, category: null });
          setCategoryTransactions([]);
        }}
      >
        {detailSheet.category && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm"
                  style={{ backgroundColor: `${detailSheet.category.color || '#4ade80'}20` }}
                >
                  {detailSheet.category.icon || '📁'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">{detailSheet.category.name}</h2>
                  <p className="text-xs text-muted">
                    {detailSheet.category.percentage}% des {type === 'expense' ? 'dépenses' : 'revenus'} du mois
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-premium-numbers text-lg font-black text-primary">
                  {formatCurrency(detailSheet.category.amount)}
                </span>
              </div>
            </div>

            {/* Averages & Trends Card */}
            {type === 'expense' && (
              <div className="bg-surface-2 p-5 rounded-2xl border border-border/40 space-y-4">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Dépenses moyennes & tendances
                </h3>

                {/* Trend Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 3M Trend */}
                  <div className="bg-surface p-3 rounded-xl border border-border/40 space-y-1">
                    <span className="text-[10px] text-muted font-bold uppercase block">Moyenne 3 mois</span>
                    <p className="font-mono text-sm font-bold text-primary">
                      {formatCurrency(detailSheet.category.movingAvg3M || 0)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {detailSheet.category.changeVs3MAvg > 0 ? (
                        <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <ArrowUpRight size={10} /> +{detailSheet.category.changeVs3MAvg}%
                        </span>
                      ) : detailSheet.category.changeVs3MAvg < 0 ? (
                        <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <ArrowDownRight size={10} /> {detailSheet.category.changeVs3MAvg}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-border/20 text-muted px-2 py-0.5 rounded-lg">
                          Stable
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 6M Trend */}
                  <div className="bg-surface p-3 rounded-xl border border-border/40 space-y-1">
                    <span className="text-[10px] text-muted font-bold uppercase block">Moyenne 6 mois</span>
                    <p className="font-mono text-sm font-bold text-primary">
                      {formatCurrency(detailSheet.category.movingAvg6M || 0)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {detailSheet.category.changeVs6MAvg > 0 ? (
                        <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <ArrowUpRight size={10} /> +{detailSheet.category.changeVs6MAvg}%
                        </span>
                      ) : detailSheet.category.changeVs6MAvg < 0 ? (
                        <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <ArrowDownRight size={10} /> {detailSheet.category.changeVs6MAvg}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-border/20 text-muted px-2 py-0.5 rounded-lg">
                          Stable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Level Comparison Bars */}
                <div className="space-y-3 pt-2 border-t border-border/25">
                  <span className="text-[10px] text-muted font-bold uppercase">Comparaison visuelle</span>
                  
                  <div className="space-y-2">
                    {/* Ce mois */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-secondary">
                        <span>{formatPeriodLabel(period)}</span>
                        <span className="font-premium-numbers">{formatCurrency(detailSheet.category.amount)}</span>
                      </div>
                      <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, (detailSheet.category.amount / Math.max(detailSheet.category.amount, detailSheet.category.movingAvg3M || 1, detailSheet.category.movingAvg6M || 1)) * 100)}%`,
                            backgroundColor: detailSheet.category.color || '#4ade80'
                          }}
                        />
                      </div>
                    </div>

                    {/* Moyenne 3M */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted">
                        <span>Moyenne 3 mois</span>
                        <span className="font-premium-numbers">{formatCurrency(detailSheet.category.movingAvg3M || 0)}</span>
                      </div>
                      <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-border/45 transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, ((detailSheet.category.movingAvg3M || 0) / Math.max(detailSheet.category.amount, detailSheet.category.movingAvg3M || 1, detailSheet.category.movingAvg6M || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Moyenne 6M */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted">
                        <span>Moyenne 6 mois</span>
                        <span className="font-premium-numbers">{formatCurrency(detailSheet.category.movingAvg6M || 0)}</span>
                      </div>
                      <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-border/45 transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, ((detailSheet.category.movingAvg6M || 0) / Math.max(detailSheet.category.amount, detailSheet.category.movingAvg3M || 1, detailSheet.category.movingAvg6M || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content list: Subcategories (if any) or Transactions (if none) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                {detailSheet.category.subcategories?.length > 0 ? 'Sous-catégories' : `Transactions ${getPeriodText(period)}`}
              </h3>

              {detailSheet.category.subcategories?.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {detailSheet.category.subcategories.map((sub, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubcategoryClick(sub.name)}
                      className="w-full bg-surface-2 p-3.5 rounded-xl border border-border/40 flex items-center justify-between hover:bg-surface-2/80 active:scale-[0.98] transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{sub.icon || '📁'}</span>
                        <div>
                          <h4 className="text-xs font-bold text-primary">{sub.name}</h4>
                          <p className="text-[10px] text-muted">{sub.percentage}% de la catégorie</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-premium-numbers text-xs font-bold text-primary">{formatCurrency(sub.amount)}</span>
                        <ChevronRight size={14} className="text-muted" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {categoryTransactionsLoading ? (
                    <div className="text-center py-4 text-xs text-muted">Chargement des transactions...</div>
                  ) : categoryTransactions.length === 0 ? (
                    <p className="text-center text-xs text-muted py-4">Aucune transaction {getPeriodText(period)}.</p>
                  ) : (
                    categoryTransactions.map(tx => (
                      <div key={tx._id} className="bg-surface-2 p-3.5 rounded-xl border border-border/40 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-primary">{tx.note || tx.description || 'Sans note'}</p>
                          <p className="text-[10px] text-muted flex items-center gap-1">
                            <Calendar size={10} /> {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className="font-premium-numbers text-xs font-bold text-primary">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

    </div>
  );
};

export default CategoryChart;
