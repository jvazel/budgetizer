import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const NetWorthChart = () => {
  const [duration, setDuration] = useState(180); // 30, 90, 180, 365 days
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const fetchNetWorthData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/charts/net-worth?days=${duration}`);
      setHistory(res.data);
    } catch (err) {
      toast.error('Erreur lors de la récupération de la richesse nette');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetWorthData();
  }, [duration]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr) => {
    const parts = dateStr.split('/');
    if (parts.length === 2) {
      // return short month / day
      return `${parts[0]}/${parts[1]}`;
    }
    return dateStr;
  };

  // Compute metrics
  const latest = history[history.length - 1] || {};
  const first = history[0] || {};

  const currentNetWorth = latest.netWorth || 0;
  const initialNetWorth = first.netWorth || 0;
  const changeValue = currentNetWorth - initialNetWorth;
  const changePercentage = initialNetWorth !== 0 ? (changeValue / Math.abs(initialNetWorth)) * 100 : 0;

  const peakNetWorth = history.length > 0 ? Math.max(...history.map(h => h.netWorth)) : 0;
  const lowestNetWorth = history.length > 0 ? Math.min(...history.map(h => h.netWorth)) : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Period Selector */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { label: '30 jours', value: 30 },
          { label: '90 jours', value: 90 },
          { label: '6 mois', value: 180 },
          { label: '1 an', value: 365 }
        ].map(p => (
          <button
            key={p.value}
            onClick={() => setDuration(p.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              duration === p.value 
                ? 'bg-accent text-white shadow-sm' 
                : 'bg-surface-2 text-secondary hover:text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Richesse Nette Actuelle */}
        <div className="bg-surface-2 p-4.5 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Richesse Nette Actuelle</p>
            <h4 className="text-lg font-extrabold text-primary mt-1">{formatCurrency(currentNetWorth)}</h4>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {changeValue >= 0 ? (
              <TrendingUp size={14} className="text-accent shrink-0" />
            ) : (
              <TrendingDown size={14} className="text-danger shrink-0" />
            )}
            <span className={`text-[10px] font-extrabold ${changeValue >= 0 ? 'text-accent' : 'text-danger'}`}>
              {changeValue >= 0 ? '+' : ''}{formatCurrency(changeValue)} ({changePercentage >= 0 ? '+' : ''}{changePercentage.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Variabilité (Min / Max) */}
        <div className="bg-surface-2 p-4.5 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Extrêmes de la période</p>
            <div className="flex justify-between items-center text-[10px] pt-1">
              <span className="text-muted font-medium">Sommet :</span>
              <span className="font-extrabold text-primary">{formatCurrency(peakNetWorth)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted font-medium">Creux :</span>
              <span className="font-extrabold text-primary">{formatCurrency(lowestNetWorth)}</span>
            </div>
          </div>
          <div className="text-[8px] text-muted/80 font-bold flex items-center gap-1 mt-2">
            <ShieldCheck size={11} className="text-accent" />
            <span>Calculé rétroactivement</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chart */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Évolution du Patrimoine</h3>
          <p className="text-[10px] text-muted">Aires empilées pour l'actif, ligne pour la Richesse Nette finale (déduction faite des dettes).</p>
        </div>

        <div className="w-full h-56 flex items-center justify-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : history.length === 0 ? (
            <div className="text-center text-muted text-xs flex flex-col items-center gap-1.5">
              <AlertCircle size={24} className="text-muted/60" />
              <span>Aucune donnée historique trouvée pour cette période.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={history.map(item => ({
                  ...item,
                  credit: item.credit ? -Math.abs(item.credit) : 0
                }))} 
                margin={{ left: -25, right: 5, top: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorChecking" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--info)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--info)" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--purple)" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--warning)" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(history.length / 5)}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                />
                 <Tooltip 
                  wrapperStyle={{ pointerEvents: 'none' }}
                  formatter={(val, name) => {
                    const labelMap = {
                      checking: 'Compte Courant',
                      savings: 'Épargne',
                      cash: 'Espèces',
                      investment: 'Investissements',
                      credit: 'Carte Crédit (Dette)',
                      netWorth: 'Richesse Nette'
                    };
                    const formattedVal = formatCurrency(name === 'credit' ? Math.abs(val) : val);
                    return [formattedVal, labelMap[name] || name];
                  }}
                  labelFormatter={(lbl) => `Date : ${lbl}`}
                  contentStyle={{
                    borderRadius: '16px',
                    background: 'rgba(10, 10, 12, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                  formatter={(value) => {
                    const labelMap = {
                      checking: 'Courant',
                      savings: 'Épargne',
                      cash: 'Espèces',
                      investment: 'Investissements',
                      credit: 'Crédit (Dette)',
                      netWorth: 'Richesse Nette'
                    };
                    return labelMap[value] || value;
                  }}
                />
                {/* Stacked Assets & Liabilities Areas */}
                <Area type="monotone" dataKey="checking" stackId="1" stroke="var(--info)" strokeWidth={1} fillOpacity={0.8} fill="url(#colorChecking)" />
                <Area type="monotone" dataKey="savings" stackId="1" stroke="var(--purple)" strokeWidth={1} fillOpacity={0.8} fill="url(#colorSavings)" />
                <Area type="monotone" dataKey="cash" stackId="1" stroke="var(--warning)" strokeWidth={1} fillOpacity={0.8} fill="url(#colorCash)" />
                <Area type="monotone" dataKey="investment" stackId="1" stroke="#10b981" strokeWidth={1} fillOpacity={0.8} fill="url(#colorInvestment)" />
                <Area type="monotone" dataKey="credit" stackId="1" stroke="var(--danger)" strokeWidth={1} fillOpacity={0.8} fill="url(#colorCredit)" />
                
                {/* Net Worth Line */}
                <Line type="monotone" dataKey="netWorth" stroke="var(--accent)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetWorthChart;
