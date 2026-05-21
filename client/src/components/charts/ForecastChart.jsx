import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAccounts } from '../../hooks/useAccounts';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ForecastChart = () => {
  const [method, setMethod] = useState('regression'); // regression, weighted, mobile, mean
  const [horizon, setHorizon] = useState(6); // 3, 6, 12 months
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ historicalData: [], forecast: [], trend: 'stable' });

  const { accounts } = useAccounts();

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : '';
      const res = await api.get(`/charts/forecast?months=${horizon}&method=${method}${accountParam}`);
      setData(res.data);
    } catch (err) {
      toast.error('Erreur lors du calcul des prévisions statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, [method, horizon, selectedAccountId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Build combined dataset for ComposedChart: historical + forecast
  // Each history object needs: month, income, expenses, balance
  // Each forecast object needs: month, projectedIncome, projectedExpenses, projectedBalance, confidenceInterval (low, high)
  const combinedData = [];

  // Add historical data
  data.historicalData.forEach(h => {
    combinedData.push({
      month: h.month,
      isForecast: false,
      income: h.income,
      expenses: h.expenses,
      balance: h.balance,
      // empty forecast fields so they don't render in history
      projIncome: null,
      projExpenses: null,
      projBalance: null,
      confidence: null
    });
  });

  // Add forecast data
  data.forecast.forEach(f => {
    combinedData.push({
      month: f.month,
      isForecast: true,
      income: null,
      expenses: null,
      balance: null,
      projIncome: f.projectedIncome,
      projExpenses: f.projectedExpenses,
      projBalance: f.projectedBalance,
      // For Recharts Area to render the confidence zone [low, high]
      confidence: [f.confidenceInterval.low, f.confidenceInterval.high]
    });
  });

  const getMethodDescription = (m) => {
    switch (m) {
      case 'regression':
        return {
          title: 'Régression Linéaire',
          desc: 'Idéal si vos revenus/dépenses sont stables. Calcule la tendance mathématique de fond de votre historique de flux de trésorerie.'
        };
      case 'weighted':
        return {
          title: 'Moyenne Pondérée',
          desc: 'Accorde plus de poids à l\'historique récent (les 3 derniers mois) pour refléter vos habitudes de consommation actuelles.'
        };
      case 'mobile':
        return {
          title: 'Moyenne Mobile',
          desc: 'Lissage sur une fenêtre glissante (3 mois). Idéal si vos revenus et prélèvements sont irréguliers ou saisonniers.'
        };
      default:
        return {
          title: 'Moyenne Simple',
          desc: 'Moyenne arithmétique globale sur les 12 mois passés. Donne une vision neutre et lissée de votre budget.'
        };
    }
  };

  const explanation = getMethodDescription(method);

  // Compute final projected balance for the card
  const finalProjectedBalance = data.forecast.length > 0 ? data.forecast[data.forecast.length - 1].projectedBalance : 0;
  const confidenceMargin = data.forecast.length > 0 ? (data.forecast[data.forecast.length - 1].confidenceInterval.high - finalProjectedBalance) : 0;

  return (
    <div className="space-y-6 pb-24">

      {/* 1. Method Selector Grid */}
      <div className="space-y-3">
        <label className="text-xs font-extrabold text-secondary tracking-wider uppercase px-1">Méthode de calcul</label>
        
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'regression', label: 'Régression', sub: 'Recommandée' },
            { id: 'weighted', label: 'Moy. Pondérée', sub: 'Récents +' },
            { id: 'mobile', label: 'Moy. Mobile', sub: 'Irréguliers' },
            { id: 'mean', label: 'Moyenne', sub: 'Revenus stables' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setMethod(item.id)}
              className={`p-3 rounded-2xl border text-left flex flex-col gap-0.5 transition-all ${
                method === item.id 
                  ? 'bg-accent/10 border-accent text-accent shadow-sm' 
                  : 'bg-surface-2 border-border/40 text-primary hover:bg-surface-2/80'
              }`}
            >
              <span className="text-xs font-bold">{item.label}</span>
              <span className={`text-[9px] font-bold ${method === item.id ? 'text-accent/90' : 'text-muted'}`}>{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Horizon & Account Selectors */}
      <div className="flex gap-4 items-center justify-between">
        {/* Future months count */}
        <div className="flex gap-1 bg-surface-2 p-1 rounded-xl">
          {[3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setHorizon(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                horizon === m ? 'bg-surface text-primary shadow-sm' : 'text-muted'
              }`}
            >
              {m} mois
            </button>
          ))}
        </div>

        {/* Account Selector */}
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="bg-surface-2 border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
        >
          <option value="">Tous les comptes</option>
          {accounts.map(a => (
            <option key={a._id} value={a._id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* 3. Explanation card */}
      <div className="p-4 bg-surface-2 rounded-2xl border border-border/30 flex items-start gap-3">
        <AlertCircle size={18} className="text-accent shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-primary mb-0.5">{explanation.title}</h4>
          <p className="text-[10px] text-secondary leading-relaxed">{explanation.desc}</p>
        </div>
      </div>

      {/* 4. Composed Chart */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Graphique des Prévisions</h3>
          <p className="text-[10px] text-muted">Flux réels passés et projections futures (zone verte claire = incertitude).</p>
        </div>

        <div className="w-full h-56 flex items-center justify-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedData}>
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(val, name) => {
                    if (name === 'balance') return [formatCurrency(val), 'Solde Réel'];
                    if (name === 'projBalance') return [formatCurrency(val), 'Solde Projeté'];
                    if (name === 'income') return [formatCurrency(val), 'Revenus Réels'];
                    if (name === 'expenses') return [formatCurrency(val), 'Dépenses Réelles'];
                    return [formatCurrency(val), name];
                  }}
                  contentStyle={{ borderRadius: '16px', background: 'rgba(30, 41, 59, 0.95)', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                
                {/* Confidence Interval (Area) */}
                <Area 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="none" 
                  fill="url(#colorConf)" 
                  name="Marge d'erreur"
                />

                {/* Vertical line between past and future */}
                <ReferenceLine 
                  x={data.historicalData.length > 0 ? data.historicalData[data.historicalData.length - 1].month : ''} 
                  stroke="#888" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Aujourd\'hui', position: 'top', fill: '#888', fontSize: 9 }}
                />

                {/* History bars (actual values) */}
                <Bar dataKey="income" name="income" fill="#10b981" fillOpacity={0.15} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="expenses" fill="#ef4444" fillOpacity={0.15} radius={[4, 4, 0, 0]} />

                {/* Solid Line (actual history balance) */}
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={false}
                  name="balance" 
                />

                {/* Dotted Line (projected forecast balance) */}
                <Line 
                  type="monotone" 
                  dataKey="projBalance" 
                  stroke="#10b981" 
                  strokeDasharray="4 4" 
                  strokeWidth={2} 
                  dot={false}
                  name="projBalance" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 5. Recap stats card */}
      {!loading && (
        <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">Solde Estimé à {horizon} mois</span>
            <h4 className="font-mono text-2xl font-black text-primary">{formatCurrency(finalProjectedBalance)}</h4>
            <p className="text-[10px] text-muted">Marge de confiance : ± {formatCurrency(confidenceMargin)}</p>
          </div>

          <div className="text-right space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider block">Tendance</span>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs capitalize ${
              data.trend === 'positive' 
                ? 'bg-accent/15 text-accent' 
                : data.trend === 'negative'
                ? 'bg-danger/15 text-danger'
                : 'bg-surface text-secondary border border-border/40'
            }`}>
              {data.trend === 'positive' ? (
                <>
                  <TrendingUp size={14} /> Hausse
                </>
              ) : data.trend === 'negative' ? (
                <>
                  <TrendingDown size={14} /> Baisse
                </>
              ) : 'Stable'}
            </div>
          </div>
        </div>
      )}

      {/* 6. Footer warning */}
      <p className="text-[10px] text-muted text-center leading-relaxed max-w-xs mx-auto">
        ⚠️ Ces prévisions sont des estimations statistiques basées sur vos flux passés. Elles ne constituent en aucun cas une garantie ou une promesse de revenus futurs.
      </p>

    </div>
  );
};

export default ForecastChart;
