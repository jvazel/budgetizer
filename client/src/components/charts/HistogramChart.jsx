import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAccounts } from '../../hooks/useAccounts';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { AlertCircle, AlertTriangle, Wallet, Scale, Calendar, Sliders, X } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';
import Select from '../ui/Select';

const HistogramChart = () => {
  const { accounts } = useAccounts();

  // Date helpers
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getThirtyDaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getThirtyDaysAgoStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [groupBy, setGroupBy] = useState(''); // '' (auto), 'day', 'week', 'month'
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ history: [], groupBy: 'day', metrics: {} });

  // Drill-down states
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodTransactions, setPeriodTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);

  const fetchHistogramData = async () => {
    if (!startDate || !endDate) return;
    
    try {
      setLoading(true);
      const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : '';
      const groupParam = groupBy ? `&groupBy=${groupBy}` : '';
      const res = await api.get(`/charts/histogram?startDate=${startDate}&endDate=${endDate}${accountParam}${groupParam}`);
      setData(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des données de l\'histogramme');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistogramData();
  }, [startDate, endDate, selectedAccountId, groupBy]);

  const handleChartClick = async (clickedData) => {
    const payload = clickedData?.activePayload?.[0]?.payload || clickedData;
    if (!payload || !payload.key) return;

    setSelectedPeriod(payload);
    setIsPeriodSheetOpen(true);
    setPeriodTransactions([]);
    setTxLoading(true);

    try {
      let start, end;
      if (data.groupBy === 'day') {
        start = payload.key;
        end = payload.key;
      } else if (data.groupBy === 'week') {
        const startDateObj = new Date(payload.key);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(startDateObj.getDate() + 6);
        start = startDateObj.toISOString().split('T')[0];
        end = endDateObj.toISOString().split('T')[0];
      } else { // month
        const [year, monthNum] = payload.key.split('-').map(Number);
        start = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
        end = new Date(year, monthNum, 0).toISOString().split('T')[0];
      }

      const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : '';
      const res = await api.get(`/transactions?startDate=${start}&endDate=${end}${accountParam}&limit=1000`);
      const list = res.data.transactions || res.data || [];
      const sorted = list.sort((a, b) => b.amount - a.amount);
      setPeriodTransactions(sorted);
    } catch (err) {
      toast.error('Impossible de charger les transactions pour cette période.');
    } finally {
      setTxLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatTickLabel = (tickValue) => {
    // If grouping by month, tick value is YYYY-MM
    if (data.groupBy === 'month' && tickValue.includes('-')) {
      const [year, month] = tickValue.split('-');
      const date = new Date(year, parseInt(month) - 1, 1);
      const label = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    // If grouping by day, it is YYYY-MM-DD
    if (data.groupBy === 'day' && tickValue.includes('-') && tickValue.split('-').length === 3) {
      const [, month, day] = tickValue.split('-');
      return `${day}/${month}`;
    }
    // Week or custom labels return directly
    return tickValue;
  };

  const { history = [], metrics = {} } = data;

  return (
    <div className="space-y-6">
      {/* 1. Filters Card */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase flex items-center gap-1.5">
          <Sliders size={14} className="text-accent" /> Filtres d'Analyse
        </h3>
        
        {/* Date presets */}
        <div className="flex gap-1.5 py-1 select-none overflow-x-auto no-scrollbar">
          {[
            { label: '30 Derniers Jours', id: '30days' },
            { label: 'Ce Mois', id: 'thisMonth' },
            { label: 'Cette Année', id: 'thisYear' }
          ].map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                const today = new Date();
                const start = new Date();
                if (preset.id === '30days') {
                  start.setDate(today.getDate() - 30);
                } else if (preset.id === 'thisMonth') {
                  start.setDate(1);
                } else if (preset.id === 'thisYear') {
                  start.setMonth(0);
                  start.setDate(1);
                }
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-border/20 border border-border/40 text-[10px] font-bold text-secondary hover:text-primary transition-all active:scale-95 shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (err) {}
              }}
              className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Date de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (err) {}
              }}
              className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Compte ciblé</label>
            <Select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Tous les comptes</option>
              {accounts.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Pas de regroupement</label>
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              align="right"
              className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Automatique (selon période)</option>
              <option value="day">Par jour</option>
              <option value="week">Par semaine</option>
              <option value="month">Par mois</option>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Income Card */}
        <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-[9px] text-secondary font-bold uppercase tracking-wider">Total Recettes</p>
            <h4 className="text-lg font-extrabold text-emerald-400 leading-tight">
              {loading ? '...' : formatCurrency(metrics.totalIncome || 0)}
            </h4>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-[9px] text-secondary font-bold uppercase tracking-wider">Total Dépenses</p>
            <h4 className="text-lg font-extrabold text-red-400 leading-tight">
              {loading ? '...' : formatCurrency(metrics.totalExpenses || 0)}
            </h4>
          </div>
        </div>

        {/* Net Savings Card */}
        <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm flex flex-col justify-between col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] text-secondary font-bold uppercase tracking-wider">Épargne nette (Solde)</p>
              <h4 className={`text-xl font-extrabold leading-tight mt-0.5 ${(metrics.netSavings || 0) >= 0 ? 'text-accent' : 'text-danger'}`}>
                {loading ? '...' : formatCurrency(metrics.netSavings || 0)}
              </h4>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-secondary font-bold uppercase tracking-wider">Taux d'Épargne</p>
              <span className={`text-xs font-bold block mt-0.5 ${(metrics.savingsRate || 0) >= 0 ? 'text-accent' : 'text-danger'}`}>
                {loading ? '...' : `${metrics.savingsRate || 0}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recharts Histogram Card */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Histogramme Périodique</h3>
            <p className="text-[10px] text-muted">
              Comparaison temporelle par {data.groupBy === 'day' ? 'jour' : data.groupBy === 'week' ? 'semaine' : 'mois'}.
            </p>
          </div>
        </div>

        <div className="w-full h-64 flex items-center justify-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : history.length === 0 ? (
            <div className="text-center text-muted text-xs flex flex-col items-center gap-1.5 py-10">
              <AlertTriangle size={24} className="text-muted/60" />
              <span>Aucune donnée pour cette période avec les filtres sélectionnés.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={history}
                margin={{ top: 10, right: 5, left: -15, bottom: 5 }}
                onClick={handleChartClick}
              >
                <defs>
                  <linearGradient id="histIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="histExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="key"
                  tickFormatter={formatTickLabel}
                  tick={{ fontSize: 9, fill: '#888', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => `${val} €`}
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  wrapperStyle={{ pointerEvents: 'none' }}
                  labelFormatter={(lbl) => {
                    // Try to format label in long style
                    if (data.groupBy === 'month' && lbl.includes('-')) {
                      const [year, month] = lbl.split('-');
                      const date = new Date(year, parseInt(month) - 1, 1);
                      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                    }
                    if (data.groupBy === 'day' && lbl.includes('-')) {
                      const date = new Date(lbl);
                      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    }
                    // For week or custom week starting date
                    const item = history.find(h => h.key === lbl);
                    return item ? item.label : lbl;
                  }}
                  formatter={(val, name) => {
                    if (name === 'income') return [formatCurrency(val), 'Recettes'];
                    if (name === 'expenses') return [formatCurrency(val), 'Dépenses'];
                    if (name === 'net') return [formatCurrency(val), 'Solde Net'];
                    return [formatCurrency(val), name];
                  }}
                  contentStyle={{
                    borderRadius: '16px',
                    background: 'rgba(10, 10, 12, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                  cursor={{ stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: '9.5px', fontWeight: 'bold', paddingBottom: '10px' }}
                  formatter={(value) => {
                    if (value === 'income') return 'Recettes';
                    if (value === 'expenses') return 'Dépenses';
                    if (value === 'net') return 'Solde Net';
                    return value;
                  }}
                />

                <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" />

                <Bar
                  dataKey="income"
                  fill="url(#histIncomeGrad)"
                  radius={[5, 5, 0, 0]}
                  barSize={history.length > 20 ? 6 : 14}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="expenses"
                  fill="url(#histExpenseGrad)"
                  radius={[5, 5, 0, 0]}
                  barSize={history.length > 20 ? 6 : 14}
                  className="cursor-pointer"
                />

                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={history.length < 32 ? { r: 2.5, strokeWidth: 1, fill: '#1e293b' } : false}
                  activeDot={{ r: 4 }}
                  className="cursor-pointer"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Sheet for detailed transactions drill-down */}
      <BottomSheet isOpen={isPeriodSheetOpen} onClose={() => setIsPeriodSheetOpen(false)}>
        <div className="space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <div>
              <h3 className="text-sm font-extrabold text-primary">
                Bilan : {selectedPeriod ? selectedPeriod.label : ''}
              </h3>
              <p className="text-[10px] text-muted mt-0.5">Détail de la période sélectionnée</p>
            </div>
            <button 
              onClick={() => setIsPeriodSheetOpen(false)} 
              className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
            >
              <X size={18} className="text-secondary" />
            </button>
          </div>

          {/* Quick Stats grid */}
          {selectedPeriod && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-surface-2 p-3 rounded-2xl border border-border/30 text-center">
                <span className="text-[8px] text-muted font-bold uppercase tracking-wider block">Recettes</span>
                <span className="font-mono text-xs font-bold text-emerald-400 block mt-1">
                  {formatCurrency(selectedPeriod.income)}
                </span>
              </div>
              <div className="bg-surface-2 p-3 rounded-2xl border border-border/30 text-center">
                <span className="text-[8px] text-muted font-bold uppercase tracking-wider block">Dépenses</span>
                <span className="font-mono text-xs font-bold text-red-400 block mt-1">
                  {formatCurrency(selectedPeriod.expenses)}
                </span>
              </div>
              <div className="bg-surface-2 p-3 rounded-2xl border border-border/30 text-center">
                <span className="text-[8px] text-muted font-bold uppercase tracking-wider block">Net</span>
                <span className={`font-mono text-xs font-bold block mt-1 ${selectedPeriod.net >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {formatCurrency(selectedPeriod.net)}
                </span>
              </div>
            </div>
          )}

          {/* Transactions listing */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase text-muted tracking-wider px-1">Transactions</h4>
            
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar py-1">
              {txLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
                </div>
              ) : periodTransactions.length === 0 ? (
                <p className="text-center text-xs text-muted py-8">Aucune transaction enregistrée.</p>
              ) : (
                periodTransactions.map(tx => (
                  <div key={tx._id} className="bg-surface-2 p-3.5 rounded-xl border border-border/30 flex items-center justify-between shadow-sm">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-primary truncate">{tx.description || 'Sans description'}</p>
                      <p className="text-[9px] text-muted flex items-center gap-1 mt-0.5 font-medium">
                        <Calendar size={10} /> {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        <span className="opacity-60">•</span>
                        <span className="truncate max-w-[100px]">{tx.categoryId?.name || 'Transfert'}</span>
                      </p>
                    </div>
                    <span className={`font-mono text-xs font-black shrink-0 ${
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

export default HistogramChart;
