import React, { useState, useEffect, useContext } from 'react';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { 
  AlertTriangle, 
  Sparkles, 
  TrendingDown, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  ChevronRight,
  CheckCircle, 
  Info,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import AmountDisplay from '../components/ui/AmountDisplay';
import { motion } from 'framer-motion';

const AiInsights = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState({ anomalies: [], suggestions: [] });
  const [threshold, setThreshold] = useState(() => user?.preferences?.anomalyThreshold || 30);
  const [selectedReductions, setSelectedReductions] = useState({}); // categoryId -> percentage (10, 20 or 30)

  // Sync threshold with user preferences when user context loads
  useEffect(() => {
    if (user?.preferences?.anomalyThreshold) {
      setThreshold(user.preferences.anomalyThreshold);
    }
  }, [user?.preferences?.anomalyThreshold]);

  // Fetch insights from backend
  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/insights', { params: { threshold } });
      setInsights(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Une erreur est survenue lors de la récupération des analyses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [threshold]);

  // Format currency helper using user preferences
  const formatCurrency = (amount) => {
    const code = user?.currency?.code || 'EUR';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: code 
    }).format(amount);
  };

  // Set selected reduction percentage for a specific category card
  const handleSelectReduction = (catId, pct) => {
    setSelectedReductions(prev => ({
      ...prev,
      [catId]: pct
    }));
  };

  const hasNoData = insights.message;

  return (
    <>
      <HeaderTitle collapsible={true}>Conseils</HeaderTitle>
      <HeaderBackButton to="/" />

      {/* Large Collapsible Header Title on Page */}
      <div className="mb-5 mt-2 px-1">
        <div className="text-2xl font-extrabold text-primary tracking-tight">Conseils IA</div>
        <p className="text-[11px] text-secondary mt-0.5 font-medium">Recommandations et pistes d'économies basées sur vos habitudes.</p>
      </div>

      <div className="space-y-6 mb-6">
        
        {/* Header Introduction Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-accent/10 to-purple/10 p-5 rounded-[24px] border border-accent/15 shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles size={100} className="text-accent" />
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-primary flex items-center gap-1.5">
                Analyses prédictives & IA
              </h2>
              <p className="text-[11px] text-secondary leading-relaxed">
                Budgetizer analyse vos habitudes financières sur les 3 derniers mois pour identifier les dérives de dépenses et suggérer des pistes d'optimisation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Loading Spinner */}
        {loading ? (
          <div className="space-y-6">
            {/* Sensibilité shimmer */}
            <div className="h-16 w-full rounded-[24px] shimmer-loader" />
            
            {/* Section Anomalies title shimmer */}
            <div className="space-y-3">
              <div className="h-4 w-48 rounded bg-surface-2 shimmer-loader" />
              <div className="h-[96px] w-full rounded-[28px] shimmer-loader" />
            </div>

            {/* Section Suggestions title shimmer */}
            <div className="space-y-3">
              <div className="h-4 w-48 rounded bg-surface-2 shimmer-loader" />
              {[1, 2].map(i => (
                <div key={i} className="h-[200px] w-full rounded-[28px] shimmer-loader" />
              ))}
            </div>
          </div>
        ) : error ? (
          /* Error State Card */
          <div className="text-center py-8 bg-danger/10 border border-danger/20 rounded-[28px] p-6 space-y-3">
            <AlertTriangle className="text-danger mx-auto" size={32} />
            <div>
              <p className="text-danger text-sm font-bold">Erreur de chargement</p>
              <p className="text-xs text-secondary mt-1">{error}</p>
            </div>
            <button 
              onClick={fetchInsights} 
              className="px-4 py-2 bg-surface rounded-xl border border-border/40 text-xs font-bold text-primary hover:bg-border/20"
            >
              Réessayer
            </button>
          </div>
        ) : hasNoData ? (
          /* No Data / Missing History State Card */
          <div className="text-center py-12 bg-surface-2 rounded-[28px] border border-dashed border-border/40 p-6 space-y-3">
            <Info className="text-accent mx-auto" size={36} />
            <div>
              <p className="text-primary text-sm font-bold">Données insuffisantes</p>
              <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                {insights.message}
              </p>
            </div>
            <p className="text-[10px] text-muted">
              Continuez à enregistrer vos dépenses mensuelles pour débloquer ces rapports automatisés.
            </p>
          </div>
        ) : (
          /* Main Insights Content */
          <>
            {/* 1. Alert Sensitivity Settings */}
            <div className="flex justify-between items-center bg-surface-2 p-4 rounded-[24px] border border-border/40">
              <div>
                <h3 className="text-xs font-bold text-primary">Sensibilité d'alerte</h3>
                <p className="text-[9px] text-muted">Alerte si dépassement de +{threshold}%</p>
              </div>
              <div className="flex bg-surface p-1 rounded-xl border border-border/40 relative">
                {[30, 40, 50, 60].map(val => (
                  <button
                    key={val}
                    onClick={() => setThreshold(val)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all relative z-10 ${
                      threshold === val 
                        ? 'text-white font-extrabold' 
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {threshold === val && (
                      <motion.div
                        layoutId="sensitivityActiveTab"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="absolute inset-0 bg-accent rounded-lg -z-10"
                      />
                    )}
                    +{val}%
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Anomalies Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-warning" /> Détection d'anomalies ce mois-ci
              </h3>

              {insights.anomalies.length === 0 ? (
                /* No Anomalies Alert Card */
                <div className="bg-accent/10 border border-accent/20 p-5 rounded-[28px] flex items-center gap-4 text-accent">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Aucune anomalie détectée</h4>
                    <p className="text-[10px] opacity-80 mt-0.5 leading-relaxed">
                      Vos dépenses du mois en cours restent cohérentes avec vos moyennes historiques sur ce niveau de sensibilité.
                    </p>
                  </div>
                </div>
              ) : (
                /* Anomalies List */
                <div className="space-y-3">
                  {insights.anomalies.map((anomaly, idx) => (
                    <div 
                      key={anomaly.categoryId || idx} 
                      className={`p-5 rounded-[28px] border flex gap-4 transition-all hover:scale-[1.01] ${
                        anomaly.severity === 'red' 
                          ? 'bg-danger/10 border-danger/20' 
                          : 'bg-orange-500/10 border-orange-500/20'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-surface border border-border/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                        {anomaly.icon || '📁'}
                      </div>
                      
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-extrabold text-primary truncate">{anomaly.name}</h4>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                            anomaly.severity === 'red' 
                              ? 'bg-danger/20 text-danger border border-danger/30' 
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            +{anomaly.differencePercentage}%
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/10">
                          <div>
                            <p className="text-[9px] text-muted uppercase font-bold tracking-wider">Ce mois-ci</p>
                            <AmountDisplay amount={anomaly.currentAmount} size="xs" type="expense" />
                          </div>
                          <div>
                            <p className="text-[9px] text-muted uppercase font-bold tracking-wider">Moyenne (3 mois)</p>
                            <AmountDisplay amount={anomaly.averageAmount} size="xs" type="neutral" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Suggestions Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown size={14} className="text-accent" /> Suggestions de réduction
                </h3>
                <span className="text-[9px] text-muted font-bold">Top 3 Dépenses</span>
              </div>

              {insights.suggestions.length === 0 ? (
                <div className="text-center py-8 bg-surface-2 rounded-[28px] border border-border/40 p-5">
                  <p className="text-xs text-muted">Aucune suggestion disponible pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.suggestions.map((suggestion, idx) => {
                    const activePct = selectedReductions[suggestion.categoryId] || 10;
                    const savings = activePct === 10 
                      ? suggestion.savings10 
                      : activePct === 20 
                        ? suggestion.savings20 
                        : suggestion.savings30;

                    return (
                      <div 
                        key={suggestion.categoryId || idx} 
                        className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4 hover:border-border/60 transition-all shadow-sm active-card-feedback relative overflow-hidden"
                      >
                        {/* Decorative glow */}
                        <div className="absolute -right-6 -top-6 w-16 h-16 bg-accent/5 rounded-full blur-xl pointer-events-none" />

                        {/* Category Info Header */}
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="w-11 h-11 rounded-xl bg-surface border border-border/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
                            {suggestion.icon || '📁'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-primary truncate uppercase tracking-wider">{suggestion.name}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-muted leading-tight mt-0.5 font-medium">
                              <span>Moyenne mensuelle habituelle :</span>
                              <AmountDisplay amount={suggestion.averageMonthlyAmount} size="xs" type="neutral" />
                            </div>
                          </div>
                        </div>

                        {/* Interactive Chips Selector */}
                        <div className="space-y-2 relative z-10">
                          <p className="text-[9px] text-muted font-bold uppercase tracking-wider">Cible d'économie</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[10, 20, 30].map(pct => (
                              <button
                                key={pct}
                                onClick={() => handleSelectReduction(suggestion.categoryId, pct)}
                                className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center active-scale-sm relative ${
                                  activePct === pct
                                    ? 'text-white font-extrabold border-transparent'
                                    : 'bg-surface border-border/40 text-secondary hover:text-primary hover:bg-surface/85'
                                }`}
                              >
                                {activePct === pct && (
                                  <motion.div
                                    layoutId={`reductionActiveTab-${suggestion.categoryId}`}
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    className="absolute inset-0 bg-copper rounded-xl -z-10"
                                  />
                                )}
                                <span>-{pct}%</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Savings Display Output */}
                        <div className="p-3.5 bg-surface rounded-2xl border border-border/40 flex items-center justify-between gap-3 relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-6.5 h-6.5 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0">
                              <TrendingDown size={14} />
                            </div>
                            <span className="text-[10px] text-secondary font-bold">Économie annuelle</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AmountDisplay amount={savings} size="sm" type="income" showSign />
                            <span className="text-xs text-muted font-bold">/ an</span>
                          </div>
                        </div>

                        {/* Subscription Warning Alert Banner */}
                        {suggestion.hasSubscription && (
                          <div className="flex items-start gap-2.5 p-3.5 bg-purple/10 border border-purple/20 rounded-2xl text-purple relative z-10">
                            <Sparkles size={14} className="shrink-0 mt-0.5 text-purple animate-pulse" />
                            <p className="text-[10px] font-medium leading-relaxed">
                              💡 <strong>Abonnements détectés :</strong> Pensez à auditer vos services actifs dans cette catégorie pour couper les coûts inutiles facilement.
                            </p>
                          </div>
                        )}

                        {/* Fiche Action CTA Buttons */}
                        <div className="pt-2 border-t border-border/20 flex gap-2">
                          {suggestion.hasSubscription ? (
                            <button
                              onClick={() => navigate('/subscriptions')}
                              className="flex-1 py-2.5 px-3 rounded-xl border border-purple/30 text-purple bg-purple/5 hover:bg-purple/10 active:scale-95 text-[11px] font-bold text-center transition-all focus:outline-none"
                            >
                              Gérer mes abonnements
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate('/budgets')}
                              className="flex-1 py-2.5 px-3 rounded-xl border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 active:scale-95 text-[11px] font-bold text-center transition-all focus:outline-none"
                            >
                              Fixer une limite budget
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AiInsights;
