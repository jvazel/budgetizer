import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAccounts } from '../../hooks/useAccounts';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { HelpCircle, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Select from '../ui/Select';

const FutureChart = () => {
  const [horizon, setHorizon] = useState(3); // 1, 3, 6, 12 months
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ periods: [], projectedBalance: [], futureTransactions: [] });

  const { accounts } = useAccounts();

  const fetchFutureData = async () => {
    try {
      setLoading(true);
      const startStr = new Date().toISOString().split('T')[0];
      const end = new Date();
      end.setMonth(end.getMonth() + horizon);
      const endStr = end.toISOString().split('T')[0];

      const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : '';
      const res = await api.get(`/charts/future?startDate=${startStr}&endDate=${endStr}${accountParam}`);
      setData(res.data);
    } catch (err) {
      toast.error('Erreur lors du calcul des prévisions de trésorerie');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFutureData();
  }, [horizon, selectedAccountId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Group future transactions by month for listing
  const groupedTransactions = {};
  data.futureTransactions.forEach(tx => {
    const d = new Date(tx.date);
    const key = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groupedTransactions[key]) groupedTransactions[key] = [];
    groupedTransactions[key].push(tx);
  });

  const CustomTooltip1 = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const formattedDate = new Date(label).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      return (
        <div className="custom-chart-tooltip text-left space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Le : {formattedDate}</p>
          <div className="flex items-center justify-between gap-6 text-[11px] font-medium">
            <span className="text-secondary">Solde estimé :</span>
            <span className="font-premium-numbers font-bold text-accent">
              {formatCurrency(payload[0].value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip2 = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-chart-tooltip text-left space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">{label}</p>
          {payload.map((item, idx) => {
            const labelName = item.name === 'income' ? 'Revenus' : 'Dépenses';
            const valColor = item.name === 'income' ? '#10b981' : '#ef4444';
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

  return (
    <div className="space-y-6">
      
      {/* 1. Filters */}
      <div className="flex gap-4 items-center justify-between">
        {/* Horizon selectors */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[1, 3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setHorizon(m)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                horizon === m 
                  ? 'bg-accent text-white shadow-sm' 
                  : 'bg-surface-2 text-secondary hover:text-primary'
              }`}
            >
              {m === 1 ? '1 mois' : `${m} mois`}
            </button>
          ))}
        </div>

        {/* Account Selector */}
        <Select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          align="right"
          className="bg-surface-2 border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
        >
          <option value="">Tous les comptes</option>
          {accounts.map(a => (
            <option key={a._id} value={a._id}>{a.name}</option>
          ))}
        </Select>
      </div>

      {/* 2. Cumulative Projected AreaChart */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Solde projeté cumulé</h3>
          <p className="text-[10px] text-muted">Évolution de votre solde global estimé basé sur vos prélèvements à venir.</p>
        </div>

        <div className="w-full h-44 flex items-center justify-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : data.projectedBalance.length === 0 ? (
            <div className="text-center text-muted text-xs">Aucune variation de solde projetée.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.projectedBalance}>
                <defs>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip1 />}
                  wrapperStyle={{ pointerEvents: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeDasharray="4 4" // Indicates forecast
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProjected)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. BarChart Income vs Expense Forecast */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Revenus vs Dépenses Prévus</h3>
          <p className="text-[10px] text-muted">Volume d'argent programmé ou en attente d'encaissement/décaissement.</p>
        </div>

        <div className="w-full h-44 flex items-center justify-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : data.periods.length === 0 ? (
            <div className="text-center text-muted text-xs">Aucune échéance mensuelle trouvée.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.periods}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip2 />}
                  wrapperStyle={{ pointerEvents: 'none' }}
                />
                <Bar dataKey="income" name="Revenus" fill="#10b981" radius={[6, 6, 0, 0]} fillOpacity={0.7} />
                <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[6, 6, 0, 0]} fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. Timeline list */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase px-1">Échéances chronologiques</h3>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-8 text-muted bg-surface-2/40 rounded-2xl border border-dashed border-border/40">
            <HelpCircle size={28} className="mx-auto text-muted/60 mb-1" />
            <p className="text-xs">Aucune échéance future sur cet horizon.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([month, txs]) => (
              <div key={month} className="space-y-2">
                {/* Month header divider */}
                <h4 className="text-[11px] font-extrabold text-muted uppercase tracking-wider px-1 capitalize">
                  {month}
                </h4>

                <div className="space-y-2">
                  {txs.map((tx, idx) => (
                    <div key={idx} className="bg-surface-2 p-4 rounded-2xl border border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-md shadow-sm shrink-0"
                          style={{ backgroundColor: `${tx.categoryId?.color || '#888'}15` }}
                        >
                          {tx.categoryId?.icon || '🔁'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-primary truncate max-w-[120px]">{tx.description}</h5>
                            
                            {/* Source badge */}
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                              tx.source === 'scheduled' 
                                ? 'bg-purple-500/10 text-purple-400' 
                                : tx.source === 'pending'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {tx.source === 'scheduled' ? 'Planifié' : tx.source === 'pending' ? 'Attente' : 'Futur'}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-muted">
                            Le {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                      </div>

                      <span className={`font-mono text-xs font-black ${tx.type === 'expense' ? 'text-primary' : 'text-accent'}`}>
                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default FutureChart;
