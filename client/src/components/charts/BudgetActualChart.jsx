import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const BudgetActualChart = () => {
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);

  const formatMonthQuery = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/budgets?month=${formatMonthQuery(month)}`);
      setBudgets(res.data);
    } catch (err) {
      toast.error('Erreur lors de la récupération des budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [month]);

  const prevMonth = () => {
    setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getMonthLabel = (date) => {
    const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Calculations
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const exceededCount = budgets.filter(b => b.spent > b.amount).length;
  const underControlCount = budgets.length - exceededCount;

  // Prepare data for Recharts
  const chartData = budgets.map(b => ({
    name: b.name || b.categoryId?.name || 'Sans nom',
    budget: parseFloat(b.amount.toFixed(2)),
    real: parseFloat(b.spent.toFixed(2)),
    percentage: b.percentage,
    exceeded: b.spent > b.amount
  }));

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
          <p className="text-[10px] text-muted">La barre supérieure (sombre) représente la limite, la barre inférieure représente le réel dépensé.</p>
        </div>

        <div className="w-full flex items-center justify-center" style={{ minHeight: `${Math.max(160, chartData.length * 60)}px` }}>
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
                layout="y"
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
                <Bar dataKey="budget" name="budget" fill="var(--bg-surface)" stroke="var(--border)" strokeWidth={1} radius={[0, 4, 4, 0]} barSize={12} />
                
                {/* Spent Bar */}
                <Bar dataKey="real" name="real" radius={[0, 4, 4, 0]} barSize={8}>
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
    </div>
  );
};

export default BudgetActualChart;
