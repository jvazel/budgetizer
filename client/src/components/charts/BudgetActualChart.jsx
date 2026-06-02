import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck, CheckCircle2, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';

const formatMonthQuery = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

const getMonthLabel = (date) => {
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const BudgetActualChart = () => {
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);

  // Drill-down states
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState(null);
  const [budgetTransactions, setBudgetTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [isTxSheetOpen, setIsTxSheetOpen] = useState(false);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/budgets?month=${formatMonthQuery(month)}`);
      setBudgets(res.data);
    } catch (err) {
      toast.error('Erreur lors de la récupération des budgets');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchBudgets();
  }, [month]);

  const prevMonth = () => {
    setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calculations
  const { totalBudgeted, totalSpent, exceededCount, underControlCount } = useMemo(() => {
    const sumBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
    const sumSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const exceeded = budgets.filter(b => b.spent > b.amount).length;
    const underControl = budgets.length - exceeded;
    return {
      totalBudgeted: sumBudgeted,
      totalSpent: sumSpent,
      exceededCount: exceeded,
      underControlCount: underControl
    };
  }, [budgets]);

  // Prepare data for Recharts
  const chartData = useMemo(() => {
    return budgets.map(b => ({
      name: b.name || b.categoryId?.name || 'Sans nom',
      budget: parseFloat(b.amount.toFixed(2)),
      real: parseFloat(b.spent.toFixed(2)),
      percentage: b.percentage,
      exceeded: b.spent > b.amount,
      categoryId: b.categoryId?._id,
      categoryIcon: b.categoryId?.icon
    }));
  }, [budgets]);

  const handleBarClick = useCallback(async (clickedData) => {
    if (!clickedData || !clickedData.categoryId) return;
    
    setSelectedBudgetCategory({
      id: clickedData.categoryId,
      name: clickedData.name,
      icon: clickedData.categoryIcon,
      spent: clickedData.real,
      budget: clickedData.budget,
      percentage: clickedData.percentage
    });
    setIsTxSheetOpen(true);
    setBudgetTransactions([]);
    setTxLoading(true);
    
    try {
      const q = formatMonthQuery(month);
      const [year, monthNum] = q.split('-').map(Number);
      const start = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, monthNum, 0).toISOString().split('T')[0];
      
      const res = await api.get(`/transactions?startDate=${start}&endDate=${end}&categoryId=${clickedData.categoryId}&limit=1000`);
      const list = res.data.transactions || res.data || [];
      const filtered = list.filter(t => t.type === 'expense');
      setBudgetTransactions(filtered);
    } catch (err) {
      toast.error('Impossible de charger les transactions pour ce budget.');
    } finally {
      setTxLoading(false);
    }
  }, [month]);

  const processedTransactions = useMemo(() => {
    return budgetTransactions.map(tx => ({
      ...tx,
      formattedDate: new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }));
  }, [budgetTransactions]);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Month Navigator */}
      <div className="w-[calc(100%+32px)] bg-surface-2 text-primary py-3 px-4 flex justify-between items-center font-bold text-sm select-none border-y border-border mx-[-16px] mb-4">
        <button onClick={prevMonth} className="p-1.5 hover:bg-surface text-secondary hover:text-primary rounded-xl active:scale-95 transition-all">
          <ChevronLeft size={18} />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-primary">{getMonthLabel(month)}</span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-surface text-secondary hover:text-primary rounded-xl active:scale-95 transition-all">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Total Budgeted vs Real */}
        <div className="bg-surface-2 p-4.5 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Total Budgété / Dépensé</p>
            <h4 className="text-base font-extrabold text-primary mt-1">
              {formatCurrency(totalSpent)} <span className="text-xs font-normal text-muted">/ {formatCurrency(totalBudgeted)}</span>
            </h4>
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] font-extrabold">
            {totalBudgeted > 0 ? (
              <span className={totalSpent <= totalBudgeted ? 'text-accent' : 'text-danger'}>
                {Math.round((totalSpent / totalBudgeted) * 100)}% de l'enveloppe globale
              </span>
            ) : (
              <span className="text-muted">Aucun budget</span>
            )}
          </div>
        </div>

        {/* Status of Budgets */}
        <div className="bg-surface-2 p-4.5 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">État des enveloppes</p>
            <div className="flex justify-between items-center text-[10px] pt-1">
              <span className="text-muted font-medium flex items-center gap-1">
                <CheckCircle2 size={12} className="text-accent" /> Respectés :
              </span>
              <span className="font-extrabold text-primary">{underControlCount}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted font-medium flex items-center gap-1">
                <AlertTriangle size={12} className="text-danger" /> Dépassés :
              </span>
              <span className="font-extrabold text-danger">{exceededCount}</span>
            </div>
          </div>
          <div className="text-[8px] text-muted/80 font-bold flex items-center gap-1 mt-1">
            <ShieldCheck size={11} className="text-accent" />
            <span>Période : Mensuelle</span>
          </div>
        </div>
      </div>

      {/* 3. Main Horizontal Bar Chart */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Comparatif par Budget</h3>
          <p className="text-[10px] text-muted">La barre supérieure (sombre) représente la limite, la barre inférieure représente le réel dépensé. Touchez une barre pour voir les détails.</p>
        </div>

        <div data-testid="chart-wrapper" className="w-full flex items-center justify-center" style={{ height: `${Math.max(160, chartData.length * 60)}px`, width: '100%' }}>
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : chartData.length === 0 ? (
            <div className="text-center text-muted text-xs flex flex-col items-center gap-1.5 py-10">
              <AlertTriangle size={24} className="text-muted/60" />
              <span>Aucun budget défini pour ce mois.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: -10, right: 10, top: 10, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 9, fill: '#bbb', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  formatter={(val, name) => [formatCurrency(val), name === 'budget' ? 'Budget alloué' : 'Dépense réelle']}
                  contentStyle={{ borderRadius: '16px', background: 'rgba(30, 41, 59, 0.95)', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                  formatter={(value) => value === 'budget' ? 'Enveloppe allouée' : 'Réel dépensé'}
                />
                
                {/* Budget Limit Bar */}
                <Bar dataKey="budget" name="budget" fill="var(--bg-budget-guide)" stroke="var(--border)" strokeWidth={1} radius={[0, 4, 4, 0]} barSize={12} />
                
                {/* Spent Bar */}
                <Bar 
                  dataKey="real" 
                  name="real" 
                  fill="var(--purple)"
                  radius={[0, 4, 4, 0]} 
                  barSize={8}
                  onClick={handleBarClick}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.exceeded ? 'var(--danger)' : 'var(--purple)'} 
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Sheet detail transactions list */}
      <BottomSheet isOpen={isTxSheetOpen} onClose={() => setIsTxSheetOpen(false)}>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <div>
              <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                <span className="text-base">{selectedBudgetCategory?.icon || '📁'}</span>
                <span>Dépenses : {selectedBudgetCategory?.name}</span>
              </h3>
              <p className="text-[10px] text-muted mt-0.5">
                {selectedBudgetCategory?.spent ? formatCurrency(selectedBudgetCategory.spent) : '0,00 €'} sur {selectedBudgetCategory?.budget ? formatCurrency(selectedBudgetCategory.budget) : '0,00 €'} ({Math.round(selectedBudgetCategory?.percentage || 0)}%)
              </p>
            </div>
            <button 
              onClick={() => setIsTxSheetOpen(false)} 
              className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
            >
              <X size={18} className="text-secondary" />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar py-1">
            {txLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
              </div>
            ) : budgetTransactions.length === 0 ? (
              <p className="text-center text-xs text-muted py-8">Aucune dépense enregistrée ce mois-ci.</p>
            ) : (
              processedTransactions.map(tx => (
                <div key={tx._id} className="bg-surface-2 p-3.5 rounded-xl border border-border/30 flex items-center justify-between shadow-sm">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-primary truncate">{tx.description || 'Sans description'}</p>
                    <p className="text-[9px] text-muted flex items-center gap-1 mt-0.5 font-medium">
                      <Calendar size={10} /> {tx.formattedDate}
                      {tx.note && <span className="truncate max-w-[120px] italic">({tx.note})</span>}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-black text-danger shrink-0">
                    -{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default BudgetActualChart;

