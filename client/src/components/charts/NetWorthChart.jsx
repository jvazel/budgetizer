import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const NetWorthChart = () => {
  const [duration, setDuration] = useState(180); // 30, 90, 180, 365 days
  const [viewMode, setViewMode] = useState('global'); // 'global', 'assets_vs_debts', 'detail'
  const [hiddenKeys, setHiddenKeys] = useState([]); // Keys to hide in detail mode
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
      return `${parts[0]}/${parts[1]}`;
    }
    return dateStr;
  };

  // Process data for charts
  const processedData = useMemo(() => {
    return history.map(item => {
      const checking = item.checking || 0;
      const savings = item.savings || 0;
      const cash = item.cash || 0;
      const investment = item.investment || 0;
      const credit = Math.abs(item.credit || 0);

      const totalAssets = checking + savings + cash + investment;
      const totalDebts = -credit;
      
      return {
        ...item,
        totalAssets,
        totalDebts,
        checking,
        savings,
        cash,
        investment,
        credit: -credit,
        netWorth: item.netWorth || (totalAssets - credit)
      };
    });
  }, [history]);

  // Compute metrics
  const latest = history[history.length - 1] || {};
  const first = history[0] || {};

  const currentNetWorth = latest.netWorth || 0;
  const initialNetWorth = first.netWorth || 0;
  const changeValue = currentNetWorth - initialNetWorth;
  const changePercentage = initialNetWorth !== 0 ? (changeValue / Math.abs(initialNetWorth)) * 100 : 0;

  const peakNetWorth = history.length > 0 ? Math.max(...history.map(h => h.netWorth)) : 0;
  const lowestNetWorth = history.length > 0 ? Math.min(...history.map(h => h.netWorth)) : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-surface/95 backdrop-blur-md p-4 rounded-2xl border border-border/40 shadow-xl space-y-2.5 text-left min-w-[200px]">
          <p className="text-[9px] font-black uppercase tracking-wider text-muted">Période : {label}</p>
          
          <div className="pb-1.5 border-b border-border/20">
            <p className="text-[9px] font-bold text-secondary uppercase tracking-wider">Richesse Nette</p>
            <p className="font-premium-numbers text-base font-extrabold text-purple mt-0.5">
              {formatCurrency(item.netWorth)}
            </p>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-secondary font-medium">Total Actifs :</span>
              <span className="font-mono font-bold text-accent">{formatCurrency(item.totalAssets)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary font-medium">Total Dettes :</span>
              <span className="font-mono font-bold text-danger">{formatCurrency(Math.abs(item.credit))}</span>
            </div>
          </div>

          {viewMode === 'detail' && (
            <div className="pt-1.5 border-t border-border/20 space-y-1 text-[9px] font-medium">
              <p className="text-[8px] text-muted font-bold uppercase tracking-wider mb-1">Détails des comptes</p>
              {!hiddenKeys.includes('checking') && (
                <div className="flex justify-between">
                  <span className="text-muted">Courant :</span>
                  <span className="font-mono text-primary font-bold">{formatCurrency(item.checking)}</span>
                </div>
              )}
              {!hiddenKeys.includes('savings') && (
                <div className="flex justify-between">
                  <span className="text-muted">Épargne :</span>
                  <span className="font-mono text-primary font-bold">{formatCurrency(item.savings)}</span>
                </div>
              )}
              {!hiddenKeys.includes('cash') && (
                <div className="flex justify-between">
                  <span className="text-muted">Espèces :</span>
                  <span className="font-mono text-primary font-bold">{formatCurrency(item.cash)}</span>
                </div>
              )}
              {!hiddenKeys.includes('investment') && (
                <div className="flex justify-between">
                  <span className="text-muted">Investissements :</span>
                  <span className="font-mono text-primary font-bold">{formatCurrency(item.investment)}</span>
                </div>
              )}
              {!hiddenKeys.includes('credit') && (
                <div className="flex justify-between">
                  <span className="text-muted">Dette Crédit :</span>
                  <span className="font-mono text-danger font-bold">-{formatCurrency(Math.abs(item.credit))}</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
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
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
              duration === p.value 
                ? 'bg-copper border-copper text-white shadow-sm font-extrabold' 
                : 'bg-surface-2 border-border/40 hover:bg-border/10 text-secondary hover:text-primary'
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
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Évolution du Patrimoine</h3>
            <p className="text-[10px] text-muted mt-0.5">Cliquez sur les onglets pour basculer la perspective visuelle.</p>
          </div>

          {/* Sub-selector for chart representation */}
          <div className="grid grid-cols-3 gap-1 bg-surface-2-glass backdrop-blur-md p-1 rounded-xl border border-border/40 self-start">
            {[
              { id: 'global', label: 'Globale' },
              { id: 'assets_vs_debts', label: 'Actifs/Dettes' },
              { id: 'detail', label: 'Détail' }
            ].map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold transition-all active:scale-95 whitespace-nowrap ${
                  viewMode === mode.id 
                    ? 'bg-surface text-primary shadow-sm' 
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-56 flex items-center justify-center">
          {loading ? (
            <div className="w-full h-full flex flex-col gap-3 py-2">
              <div className="h-4/5 w-full rounded-2xl shimmer-loader" />
              <div className="flex justify-between px-2">
                <div className="h-3 w-10 rounded bg-surface-2 shimmer-loader" />
                <div className="h-3 w-10 rounded bg-surface-2 shimmer-loader" />
                <div className="h-3 w-10 rounded bg-surface-2 shimmer-loader" />
                <div className="h-3 w-10 rounded bg-surface-2 shimmer-loader" />
              </div>
            </div>
          ) : processedData.length === 0 ? (
            <div className="text-center text-muted text-xs flex flex-col items-center gap-1.5">
              <AlertCircle size={24} className="text-muted/60" />
              <span>Aucune donnée historique trouvée pour cette période.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={processedData} 
                margin={{ left: -25, right: 5, top: 10, bottom: 5 }}
              >
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(processedData.length / 5)}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                />
                 <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ pointerEvents: 'none' }}
                />

                {/* Mode 1: Vue Globale (Epuré, lueur sous courbe) */}
                {viewMode === 'global' && (
                  <>
                    <defs>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.16}/>
                        <stop offset="95%" stopColor="var(--purple)" stopOpacity={0.00}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="netWorth" stroke="none" fill="url(#colorNetWorth)" />
                    {/* Glowing effect curve */}
                    <Line type="monotone" dataKey="netWorth" stroke="var(--purple)" strokeWidth={8} strokeOpacity={0.12} dot={false} activeDot={false} />
                    <Line type="monotone" dataKey="netWorth" stroke="var(--purple)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--purple)', stroke: '#fff', strokeWidth: 1.5 }} />
                  </>
                )}

                {/* Mode 2: Actifs vs Dettes (Deux courbes minimalistes) */}
                {viewMode === 'assets_vs_debts' && (
                  <>
                    <defs>
                      <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.00}/>
                      </linearGradient>
                      <linearGradient id="colorDebts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.00}/>
                        <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.12}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="totalAssets" stroke="none" fill="url(#colorAssets)" />
                    <Area type="monotone" dataKey="totalDebts" stroke="none" fill="url(#colorDebts)" />
                    
                    {/* Assets neon glow */}
                    <Line type="monotone" dataKey="totalAssets" stroke="#10b981" strokeWidth={8} strokeOpacity={0.12} dot={false} activeDot={false} />
                    <Line type="monotone" dataKey="totalAssets" stroke="#10b981" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
                    
                    {/* Debts neon glow */}
                    <Line type="monotone" dataKey="totalDebts" stroke="var(--danger)" strokeWidth={8} strokeOpacity={0.12} dot={false} activeDot={false} />
                    <Line type="monotone" dataKey="totalDebts" stroke="var(--danger)" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
                  </>
                )}

                {/* Mode 3: Détails des comptes (Courbes individuelles) */}
                {viewMode === 'detail' && (
                  <>
                    {!hiddenKeys.includes('checking') && (
                      <Line type="monotone" dataKey="checking" stroke="var(--info)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    )}
                    {!hiddenKeys.includes('savings') && (
                      <Line type="monotone" dataKey="savings" stroke="var(--purple)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    )}
                    {!hiddenKeys.includes('cash') && (
                      <Line type="monotone" dataKey="cash" stroke="var(--warning)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    )}
                    {!hiddenKeys.includes('investment') && (
                      <Line type="monotone" dataKey="investment" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    )}
                    {!hiddenKeys.includes('credit') && (
                      <Line type="monotone" dataKey="credit" stroke="var(--danger)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    )}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Custom Interactive Legend (visible in Detail mode) */}
        {viewMode === 'detail' && (
          <div className="flex flex-wrap justify-center gap-3 pt-1 select-none">
            {[
              { key: 'checking', label: 'Courant', color: 'var(--info)' },
              { key: 'savings', label: 'Épargne', color: 'var(--purple)' },
              { key: 'cash', label: 'Espèces', color: 'var(--warning)' },
              { key: 'investment', label: 'Investissements', color: '#10b981' },
              { key: 'credit', label: 'Dettes', color: 'var(--danger)' }
            ].map(item => {
              const isHidden = hiddenKeys.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (isHidden) {
                      setHiddenKeys(prev => prev.filter(k => k !== item.key));
                    } else {
                      setHiddenKeys(prev => [...prev, item.key]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold transition-all active:scale-95 ${
                    isHidden
                      ? 'border-border/30 bg-transparent text-muted opacity-45'
                      : 'border-border/60 bg-surface text-primary shadow-sm'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isHidden ? '#555' : item.color, boxShadow: isHidden ? 'none' : `0 0 6px ${item.color}` }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetWorthChart;
