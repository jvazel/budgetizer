import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAccounts } from '../../hooks/useAccounts';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../ui/BottomSheet';
import Select from '../ui/Select';

const ForecastChart = () => {
  const [method, setMethod] = useState('regression'); // regression, weighted, mobile, mean
  const [horizon, setHorizon] = useState(6); // 3, 6, 12 months
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ historicalData: [], forecast: [], trend: 'stable' });

  // Drill-down states
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [detailTransactions, setDetailTransactions] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  const handleChartClick = async (clickedData) => {
    const payload = clickedData?.activePayload?.[0]?.payload || clickedData;
    if (!payload || !payload.month) return;

    setSelectedMonth(payload);
    setIsSheetOpen(true);
    setDetailTransactions([]);
    setDetailLoading(true);

    try {
      const [year, monthNum] = payload.month.split('-').map(Number);
      const start = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, monthNum, 0).toISOString().split('T')[0];
      const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : '';

      if (payload.isForecast) {
        // Fetch future/projected transactions
        const res = await api.get(`/charts/future?startDate=${start}&endDate=${end}${accountParam}`);
        setDetailTransactions(res.data.futureTransactions || []);
      } else {
        // Fetch actual transactions from history
        const res = await api.get(`/transactions?startDate=${start}&endDate=${end}${accountParam}&limit=1000`);
        const list = res.data.transactions || res.data || [];
        setDetailTransactions(list);
      }
    } catch (err) {
      toast.error('Impossible de charger le détail de ce mois.');
    } finally {
      setDetailLoading(false);
    }
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
          <p className="text-[10px] text-muted">Flux réels passés et projections futures. Touchez un point ou une barre pour voir les transactions du mois.</p>
        </div>

        <div className="w-full h-56 flex items-center justify-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedData} onClick={handleChartClick}>
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonthShortLabel}
                  tick={{ fontSize: 9, fill: '#888', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  wrapperStyle={{ pointerEvents: 'none' }}
                  labelFormatter={formatMonthLabel}
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
                <Bar dataKey="income" name="income" fill="#10b981" fillOpacity={0.15} radius={[4, 4, 0, 0]} className="cursor-pointer" />
                <Bar dataKey="expenses" name="expenses" fill="#ef4444" fillOpacity={0.15} radius={[4, 4, 0, 0]} className="cursor-pointer" />

                {/* Solid Line (actual history balance) */}
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={true}
                  name="balance" 
                  className="cursor-pointer"
                />

                {/* Dotted Line (projected forecast balance) */}
                <Line 
                  type="monotone" 
                  dataKey="projBalance" 
                  stroke="#10b981" 
                  strokeDasharray="4 4" 
                  strokeWidth={2} 
                  dot={true}
                  name="projBalance" 
                  className="cursor-pointer"
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

      {/* Bottom Sheet for month details drill-down */}
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        <div className="space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <div>
              <h3 className="text-sm font-extrabold text-primary">
                Détail : {selectedMonth ? formatMonthLabel(selectedMonth.month) : ''}
                {selectedMonth?.isForecast ? ' (Prévisions)' : ' (Historique)'}
              </h3>
              <p className="text-[10px] text-muted mt-0.5">
                {selectedMonth?.isForecast 
                  ? `Solde projeté : ${formatCurrency(selectedMonth?.projBalance || 0)}`
                  : `Épargne réelle : ${formatCurrency(selectedMonth?.balance || 0)}`}
              </p>
            </div>
            <button 
              onClick={() => setIsSheetOpen(false)} 
              className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
            >
              <X size={18} className="text-secondary" />
            </button>
          </div>

          {/* Transactions listing */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase text-muted tracking-wider px-1">
              {selectedMonth?.isForecast ? 'Échéances & Transactions Prévues' : 'Transactions Réelles du Mois'}
            </h4>
            
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar py-1">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
                </div>
              ) : detailTransactions.length === 0 ? (
                <p className="text-center text-xs text-muted py-8">Aucune transaction enregistrée ou planifiée.</p>
              ) : (
                detailTransactions.map((tx, idx) => (
                  <div key={tx._id || idx} className="bg-surface-2 p-3.5 rounded-xl border border-border/30 flex items-center justify-between shadow-sm">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-primary truncate">
                        {tx.description || tx.note || 'Sans description'}
                      </p>
                      <p className="text-[9px] text-muted flex items-center gap-1 mt-0.5 font-medium">
                        <Calendar size={10} /> {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        <span className="opacity-80">•</span>
                        <span className="truncate max-w-[120px]">{tx.categoryId?.name || 'Virement/Transfert'}</span>
                        {tx.source === 'scheduled' && (
                          <span className="bg-accent/10 text-accent text-[8px] font-extrabold px-1.5 py-0.5 rounded-md font-sans">Récurrent</span>
                        )}
                        {tx.source === 'pending' && (
                          <span className="bg-warning/10 text-warning text-[8px] font-extrabold px-1.5 py-0.5 rounded-md font-sans">En attente</span>
                        )}
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

export default ForecastChart;
