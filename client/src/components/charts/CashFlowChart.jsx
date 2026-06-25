import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAccounts } from '../../hooks/useAccounts';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, CartesianGrid } from 'recharts';
import { AlertCircle, AlertTriangle, CheckCircle2, Wallet, Scale, Activity, X, Calendar, ArrowUpDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';
import Select from '../ui/Select';

const CashFlowChart = ({ isWidget = false, onViewDetail, period: externalPeriod, endDate: externalEndDate }) => {
  const [horizon, setHorizon] = useState(12); // 6, 12, 24 months
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ history: [], metrics: {} });

  // Drill-down states
  const [selectedMonthFlow, setSelectedMonthFlow] = useState(null);
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);

  const { accounts } = useAccounts();

  const fetchCashFlowData = async () => {
    try {
      setLoading(true);
      const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : '';
      const endParam = externalEndDate ? `&endDate=${externalEndDate}` : '';
      const res = await api.get(`/charts/cash-flow?months=${horizon}${accountParam}${endParam}`);
      setData(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des données de Cash Flow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlowData();
  }, [horizon, selectedAccountId, externalEndDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const formatMonthShortLabel = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    const label = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const { history = [], metrics = {} } = data;

  // Prepare status banner styling
  const getStatusStyles = (status) => {
    switch (status) {
      case 'warning':
        return {
          bg: 'bg-danger/10 border-danger/25 text-red-200',
          icon: AlertTriangle,
          iconColor: 'text-danger',
          title: 'Déficit de Trésorerie',
          badge: 'bg-danger/20 text-danger border border-danger/30'
        };
      case 'tight':
        return {
          bg: 'bg-warning/10 border-warning/25 text-amber-200',
          icon: AlertCircle,
          iconColor: 'text-warning',
          title: 'Flux de Trésorerie Serré',
          badge: 'bg-warning/20 text-warning border border-warning/30'
        };
      case 'healthy':
      default:
        return {
          bg: 'bg-accent/10 border-accent/20 text-emerald-200',
          icon: CheckCircle2,
          iconColor: 'text-accent',
          title: 'Budget Excédentaire',
          badge: 'bg-accent/20 text-accent border border-accent/30'
        };
    }
  };

  const statusStyle = getStatusStyles(metrics.status);
  const StatusIcon = statusStyle.icon;

  const handleBarClick = async (clickedData) => {
    const payload = clickedData?.activePayload?.[0]?.payload || clickedData;
    if (!payload || !payload.month) return;
    
    setSelectedMonthFlow(payload);
    setIsMonthSheetOpen(true);
    setMonthTransactions([]);
    setTxLoading(true);
    
    try {
      const [year, monthNum] = payload.month.split('-').map(Number);
      const start = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, monthNum, 0).toISOString().split('T')[0];
      
      const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : '';
      const res = await api.get(`/transactions?startDate=${start}&endDate=${end}${accountParam}&limit=1000`);
      
      const list = res.data.transactions || res.data || [];
      const sorted = list.sort((a, b) => b.amount - a.amount);
      setMonthTransactions(sorted);
    } catch (err) {
      toast.error('Impossible de charger les transactions de ce mois.');
    } finally {
      setTxLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthLabel = formatMonthLabel(label);
      return (
        <div className="custom-chart-tooltip text-left space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">{monthLabel}</p>
          {payload.map((item, idx) => {
            let labelName = item.name;
            let valColor = item.color;
            if (item.name === 'income') { labelName = 'Revenus'; valColor = '#10b981'; }
            else if (item.name === 'expenses') { labelName = 'Dépenses'; valColor = '#f43f5e'; }
            else if (item.name === 'net') { labelName = 'Solde Net'; valColor = '#8b5cf6'; }
            return (
              <div key={idx} className="flex items-center justify-between gap-6 text-[11px] font-medium">
                <span className="text-secondary">{labelName} :</span>
                <span className="font-premium-numbers font-bold" style={{ color: valColor }}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (isWidget) {
    return (
      <div 
        onClick={onViewDetail}
        className="bg-surface-2 border border-border/40 rounded-[28px] p-5 shadow-sm hover:border-copper/30 active:scale-98 transition-all cursor-pointer select-none space-y-4 group relative overflow-hidden h-[256px] flex flex-col justify-between"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowUpDown size={16} />
            </div>
            <h3 className="text-xs font-extrabold text-primary group-hover:text-copper transition-colors">Cash Flow Mensuel</h3>
          </div>
          <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors" />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-copper/30 border-t-copper animate-spin" />
          </div>
        ) : !data.history || data.history.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-muted font-bold">
            Aucune donnée de Cash Flow
          </div>
        ) : (
          <div className="flex-1 h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.history.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.65} barSize={10} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} opacity={0.65} barSize={10} />
                <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Filters (Horizon + Account Selector) */}
      <div className="flex gap-4 items-center justify-between">
        {/* Horizon selector */}
        <div className="flex gap-1 bg-surface-2-glass backdrop-blur-md p-1 rounded-xl border border-border/40">
          {[6, 12, 24].map(m => (
            <button
              key={m}
              onClick={() => setHorizon(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                horizon === m ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              {m} mois
            </button>
          ))}
        </div>

        {/* Account selector */}
        <Select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          align="right"
          className="bg-surface-2-glass backdrop-blur-md border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
        >
          <option value="">Tous les comptes</option>
          {accounts.map(a => (
            <option key={a._id} value={a._id}>{a.name}</option>
          ))}
        </Select>
      </div>

      {/* 2. Dynamic Diagnostic Banner */}
      {!loading && metrics.message && (
        <div className={`p-4 rounded-[24px] border flex items-start gap-3.5 transition-all shadow-sm ${statusStyle.bg}`}>
          <StatusIcon size={20} className={`${statusStyle.iconColor} shrink-0 mt-0.5`} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-primary">{statusStyle.title}</h4>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${statusStyle.badge}`}>
                {metrics.savingsRate > 0 ? `Taux d'épargne : +${metrics.savingsRate}%` : `Taux d'épargne : ${metrics.savingsRate}%`}
              </span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-secondary">{metrics.message}</p>
          </div>
        </div>
      )}

      {/* 3. Key Metrics Cards Grid */}
      <div className="grid grid-cols-3 gap-3.5">
        {/* Card 1: Total Savings / Rate */}
        <div className="bg-surface-2/80 backdrop-blur-md p-4 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Wallet size={14} />
            </div>
            <p className="text-[9px] text-secondary font-bold uppercase tracking-wider mt-2.5">Épargne Nette</p>
            <h4 className={`font-premium-numbers text-xs sm:text-sm font-extrabold mt-0.5 leading-tight ${metrics.netSavings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {loading ? '...' : formatCurrency(metrics.netSavings)}
            </h4>
          </div>
          <p className="text-[9px] text-muted font-bold mt-2">
            {!loading && (metrics.savingsRate >= 0 ? `+${metrics.savingsRate}% des revenus` : `${metrics.savingsRate}% des revenus`)}
          </p>
        </div>

        {/* Card 2: Averages */}
        <div className="bg-surface-2/80 backdrop-blur-md p-4 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Scale size={14} />
            </div>
            <p className="text-[9px] text-secondary font-bold uppercase tracking-wider mt-2.5">Moyenne / Mois</p>
            <h4 className="font-premium-numbers text-xs sm:text-sm font-extrabold mt-0.5 leading-tight text-primary">
              {loading ? '...' : formatCurrency(metrics.avgNet)}
            </h4>
          </div>
          <div className="font-premium-numbers text-[8px] text-muted font-bold mt-2 space-y-0.5">
            <div>Rev: {loading ? '...' : formatCurrency(metrics.avgIncome)}</div>
            <div>Dép: {loading ? '...' : formatCurrency(metrics.avgExpenses)}</div>
          </div>
        </div>

        {/* Card 3: Monthly Breakdown */}
        <div className="bg-surface-2/80 backdrop-blur-md p-4 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Activity size={14} />
            </div>
            <p className="text-[9px] text-secondary font-bold uppercase tracking-wider mt-2.5">Mois Positifs</p>
            <h4 className="font-premium-numbers text-xs sm:text-sm font-extrabold mt-0.5 leading-tight text-primary">
              {loading ? '...' : `${metrics.positiveMonths} / ${horizon}`}
            </h4>
          </div>
          <p className="text-[9px] text-muted font-bold mt-2">
            {!loading && `${metrics.negativeMonths} mois déficitaires`}
          </p>
        </div>
      </div>

      {/* 4. Chart Card */}
      <div className="bg-surface-2/80 backdrop-blur-md p-5 rounded-[28px] border border-border/40 shadow-md space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Graphique Mensuel</h3>
          <p className="text-[10px] text-muted">Comparaison directe entre vos gains (vert) et vos dépenses (rouge). La ligne violette montre l'épargne nette. Touchez une barre pour voir les détails.</p>
        </div>

        <div className="w-full h-64 flex items-center justify-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : history.length === 0 ? (
            <div className="text-center text-muted text-xs flex flex-col items-center gap-1.5 py-10">
              <AlertTriangle size={24} className="text-muted/60" />
              <span>Aucune donnée disponible pour cette période.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={history}
                margin={{ top: 10, right: 5, left: -15, bottom: 5 }}
                onClick={handleBarClick}
              >
                <defs>
                  <linearGradient id="cfIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.15}/>
                  </linearGradient>
                  <linearGradient id="cfExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.02)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthShortLabel}
                  tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `${val} €`}
                  tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ pointerEvents: 'none' }}
                  cursor={{ stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: '9.5px', fontWeight: 'bold', paddingBottom: '10px' }}
                  formatter={(value) => {
                    if (value === 'income') return 'Revenus';
                    if (value === 'expenses') return 'Dépenses';
                    if (value === 'net') return 'Épargne Nette (Cash Flow)';
                    return value;
                  }}
                />

                {/* Grid line at 0 net */}
                <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" />

                {/* Bars for Income & Expenses side-by-side */}
                <Bar
                  dataKey="income"
                  fill="url(#cfIncomeGrad)"
                  radius={[5, 5, 0, 0]}
                  barSize={10}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="expenses"
                  fill="url(#cfExpenseGrad)"
                  radius={[5, 5, 0, 0]}
                  barSize={10}
                  className="cursor-pointer"
                />

                {/* Line overlay for Net Cash Flow */}
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, fill: 'var(--bg-surface)' }}
                  activeDot={{ r: 5 }}
                  className="cursor-pointer"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 5. Analysis Advice Card */}
      {!loading && (
        <div className="bg-surface-2/80 backdrop-blur-md p-5 rounded-[28px] border border-border/40 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-accent" />
            <h3 className="text-xs font-extrabold text-primary tracking-wider uppercase">Comment interpréter ce graphique ?</h3>
          </div>
          <div className="text-[10.5px] leading-relaxed text-secondary space-y-2">
            <p>
              Pour avoir des finances saines, les barres de <strong>Revenus (vertes)</strong> doivent idéalement être plus hautes que les barres de <strong>Dépenses (rouges)</strong>, maintenant la ligne <strong>violette (Solde Net)</strong> au-dessus de zéro.
            </p>
            <p>
              Si la ligne descend en dessous de zéro, cela indique un <strong>déficit</strong> pour ce mois (vous vivez au-dessus de vos moyens en puisant dans vos économies ou par le crédit).
            </p>
            <p className="text-muted">
              💡 <em>Règle des 50/30/20 :</em> Essayez de viser un taux d'épargne (au moins 10% à 20% des revenus) pour vous constituer un apport de précaution ou réaliser vos objectifs d'épargne.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Sheet for monthly details drill-down */}
      <BottomSheet isOpen={isMonthSheetOpen} onClose={() => setIsMonthSheetOpen(false)}>
        <div className="space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <div>
              <h3 className="text-sm font-extrabold text-primary">
                Bilan : {selectedMonthFlow ? formatMonthLabel(selectedMonthFlow.month) : ''}
              </h3>
              <p className="text-[10px] text-muted mt-0.5">Récapitulatif des flux de trésorerie</p>
            </div>
            <button 
              onClick={() => setIsMonthSheetOpen(false)} 
              className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
            >
              <X size={18} className="text-secondary" />
            </button>
          </div>

          {/* Quick Stats grid */}
          {selectedMonthFlow && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-surface-2 p-3 rounded-2xl border border-border/30 text-center">
                <span className="text-[8px] text-muted font-bold uppercase tracking-wider block">Gains</span>
                <span className="font-mono text-xs font-bold text-emerald-400 block mt-1">
                  {formatCurrency(selectedMonthFlow.income)}
                </span>
              </div>
              <div className="bg-surface-2 p-3 rounded-2xl border border-border/30 text-center">
                <span className="text-[8px] text-muted font-bold uppercase tracking-wider block">Dépenses</span>
                <span className="font-mono text-xs font-bold text-red-400 block mt-1">
                  {formatCurrency(selectedMonthFlow.expenses)}
                </span>
              </div>
              <div className="bg-surface-2 p-3 rounded-2xl border border-border/30 text-center">
                <span className="text-[8px] text-muted font-bold uppercase tracking-wider block">Épargne</span>
                <span className={`font-mono text-xs font-bold block mt-1 ${selectedMonthFlow.net >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {formatCurrency(selectedMonthFlow.net)}
                </span>
              </div>
            </div>
          )}

          {/* Transactions listing */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase text-muted tracking-wider px-1">Transactions du Mois</h4>
            
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar py-1">
              {txLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
                </div>
              ) : monthTransactions.length === 0 ? (
                <p className="text-center text-xs text-muted py-8">Aucune transaction ce mois-ci.</p>
              ) : (
                monthTransactions.map(tx => (
                  <div key={tx._id} className="bg-surface-2 p-3.5 rounded-[24px] border border-border/30 flex items-center justify-between hover:bg-surface/30 transition-all cursor-pointer">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-primary truncate leading-snug">
                        {tx.description || tx.note || (tx.type === 'transfer' ? 'Virement' : tx.categoryId?.name) || 'Sans description'}
                      </p>
                      <p className="text-[9px] text-muted flex items-center gap-1 mt-0.5 font-medium">
                        <Calendar size={10} /> {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {tx.categoryId?.name && (
                          <>
                            <span className="opacity-60">•</span>
                            <span className="truncate max-w-[100px]">{tx.categoryId?.name}</span>
                          </>
                        )}
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
                    <span className={`font-premium-numbers text-xs font-black shrink-0 ${
                      tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-danger' : 'text-blue-400'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default CashFlowChart;
