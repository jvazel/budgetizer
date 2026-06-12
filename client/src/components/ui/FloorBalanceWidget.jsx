import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle, 
  Settings, 
  AlertTriangle, 
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { 
  getEstimatedPaycheckDate, 
  calculateFloorBalance, 
  calculateFloorProjection 
} from '../../utils/floorBalanceHelper';
import { triggerHaptic } from '../../utils/hapticHelper';

const FloorBalanceWidget = ({ actualBalance = 0, upcoming = [], loading = false }) => {
  const { user } = useContext(AuthContext);
  const currencySymbol = user?.currency?.symbol || '€';
  const currencyCode = user?.currency?.code || 'EUR';

  // State pour le jour de paye configuré
  const [paycheckDayConfig, setPaycheckDayConfig] = useState(() => {
    return localStorage.getItem('budgetizer_paycheck_day') || 'auto';
  });
  
  // State pour le panneau d'options
  const [showSettings, setShowSettings] = useState(false);
  
  // State pour les échéances exclues du calcul (cochées/payées)
  const [excludedIds, setExcludedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('budgetizer_excluded_floor_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State pour l'accordéon pliable des échéances
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);

  // Sauvegarde des exclusions
  useEffect(() => {
    localStorage.setItem('budgetizer_excluded_floor_expenses', JSON.stringify(excludedIds));
  }, [excludedIds]);

  // Sauvegarde de la configuration jour de paye
  const handlePaycheckDayChange = (value) => {
    setPaycheckDayConfig(value);
    localStorage.setItem('budgetizer_paycheck_day', value);
  };

  // Basculer l'état d'une facture (exclure/inclure)
  const toggleExpenseExclusion = (id) => {
    triggerHaptic('light');
    setExcludedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 1. Filtrer les revenus à venir
  const upcomingIncomes = useMemo(() => {
    return upcoming.filter(tx => tx.type === 'income');
  }, [upcoming]);

  // 2. Déterminer la date de la prochaine paye
  const nextPaycheckDate = useMemo(() => {
    return getEstimatedPaycheckDate(new Date(), upcomingIncomes, paycheckDayConfig);
  }, [upcomingIncomes, paycheckDayConfig]);

  // 3. Récupérer toutes les dépenses planifiées d'ici la paye
  const pendingRecurringExpenses = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const paycheckStart = new Date(nextPaycheckDate.getFullYear(), nextPaycheckDate.getMonth(), nextPaycheckDate.getDate()).getTime();

    return upcoming.filter(tx => {
      if (tx.type !== 'expense') return false;
      const txDate = new Date(tx.date);
      const txTime = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
      return txTime >= todayStart && txTime < paycheckStart;
    });
  }, [upcoming, nextPaycheckDate]);

  // 4. Calculer le montant cumulé des charges récurrentes engagées NON exclues
  const totalPendingExpenses = useMemo(() => {
    const activeExpenses = pendingRecurringExpenses.filter(tx => !excludedIds.includes(tx._id));
    return activeExpenses.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [pendingRecurringExpenses, excludedIds]);

  // 5. Calculer le Solde Plancher (Vrai Disponible)
  const floorBalance = useMemo(() => {
    return calculateFloorBalance(actualBalance, new Date(), upcoming, nextPaycheckDate, excludedIds);
  }, [actualBalance, upcoming, nextPaycheckDate, excludedIds]);

  // 6. Déterminer l'état de sécurité
  const comfortRatio = actualBalance > 0 ? floorBalance / actualBalance : 0;
  const isComfortable = floorBalance > 0 && comfortRatio > 0.2;

  // 7. Générer les 30 points pour le graphique de projection
  const projectionData = useMemo(() => {
    return calculateFloorProjection(actualBalance, new Date(), upcoming, excludedIds);
  }, [actualBalance, upcoming, excludedIds]);

  // 8. Déterminer si le solde risque de chuter sous zéro dans la projection
  const hasRiskOfNegative = useMemo(() => {
    return projectionData.some(pt => pt.balance < 0);
  }, [projectionData]);

  // Formatter de devise
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm animate-pulse space-y-4">
        <div className="h-4 w-1/3 bg-surface rounded" />
        <div className="h-8 w-1/2 bg-surface rounded" />
        <div className="h-16 w-full bg-surface rounded" />
      </div>
    );
  }

  return (
    <section className="mb-6">
      <div className="bg-surface-2 rounded-[24px] border border-border/40 p-5 shadow-sm space-y-4 relative overflow-hidden transition-all duration-300">
        
        {/* En-tête du widget */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-secondary/80 font-bold tracking-widest uppercase">
              Vrai Disponible (Solde Plancher)
            </p>
            <h2 className={`text-3xl font-extrabold font-premium-numbers tracking-tight mt-1 transition-colors ${
              isComfortable ? 'text-accent' : floorBalance <= 0 ? 'text-danger' : 'text-warning'
            }`}>
              {formatCurrency(floorBalance)}
            </h2>
            <p className="text-[10px] text-muted font-medium mt-0.5">
              Solde bancaire actuel : <span className="font-semibold text-secondary">{formatCurrency(actualBalance)}</span>
            </p>
          </div>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
              showSettings 
                ? 'bg-accent/10 border-accent/20 text-accent' 
                : 'bg-surface border-border/20 text-secondary hover:text-primary active:bg-white/[0.04]'
            }`}
            aria-label="Configurer le jour de paye"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Panneau de configuration du jour de paye */}
        {showSettings && (
          <div className="bg-surface/50 border border-border/20 rounded-2xl p-4.5 space-y-3 animate-none">
            <div className="flex justify-between items-center">
              <label htmlFor="paycheck-select" className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Calendar size={14} className="text-accent" /> Jour récurrent de paye
              </label>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-[10px] font-bold text-accent hover:underline"
              >
                Fermer
              </button>
            </div>
            
            <p className="text-[10px] text-muted leading-relaxed">
              Le Solde Plancher déduit les factures prévues entre aujourd'hui et votre prochaine paye. Configurez le jour ou laissez en automatique.
            </p>

            <select
              id="paycheck-select"
              value={paycheckDayConfig}
              onChange={(e) => handlePaycheckDayChange(e.target.value)}
              className="w-full bg-surface border border-border/40 px-3 py-2.5 rounded-xl text-xs font-bold text-primary focus:outline-none"
            >
              <option value="auto">Automatique (Détecter via les revenus)</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>Le {day === 1 ? '1er' : day} du mois</option>
              ))}
            </select>
          </div>
        )}

        {/* Indicateur visuel de sécurité */}
        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors ${
          isComfortable 
            ? 'bg-accent-dim/10 border-accent/20 text-accent' 
            : 'bg-danger-dim/10 border-danger/20 text-danger'
        }`}>
          {isComfortable ? (
            <Sparkles className="shrink-0 text-accent mt-0.5" size={16} />
          ) : (
            <AlertTriangle className="shrink-0 text-danger mt-0.5" size={16} />
          )}
          <div className="flex-1 min-w-0">
            {isComfortable ? (
              <p className="text-[10px] font-semibold leading-relaxed">
                Votre Solde Plancher est confortable. Toutes les charges d'ici votre paye ({formatCurrency(totalPendingExpenses)}) sont couvertes à plus de 20%.
              </p>
            ) : (
              <p className="text-[10px] font-semibold leading-relaxed">
                Attention, <span className="font-bold font-premium-numbers text-xs">{formatCurrency(totalPendingExpenses)}</span> de factures récurrentes vont être prélevées d'ici votre paye le {nextPaycheckDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.
              </p>
            )}
          </div>
        </div>

        {/* Mini Graphique de tendance (Sparkline / Area Chart) */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Tendance à 30 jours</span>
            {hasRiskOfNegative && (
              <span className="text-[9px] font-bold text-danger flex items-center gap-0.5 animate-pulse">
                ⚠️ Passage en zone négative détecté
              </span>
            )}
          </div>
          <div className="w-full h-[120px] flex items-center justify-center relative select-none">
            {projectionData.length === 0 ? (
              <div className="text-center text-muted text-xs">Aucune projection disponible.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 5, right: 2, left: 2, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorFloor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isComfortable ? "var(--accent)" : "var(--danger)"} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={isComfortable ? "var(--accent)" : "var(--danger)"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    ticks={[projectionData[0]?.date, projectionData[projectionData.length - 1]?.date]}
                    tickFormatter={(tick) => {
                      if (!tick) return '';
                      const d = new Date(tick);
                      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                    }}
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(val) => [formatCurrency(val), 'Solde projeté']}
                    labelFormatter={(lbl) => `Le : ${new Date(lbl).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    wrapperStyle={{ pointerEvents: 'none' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      background: 'var(--bg-elevated)', 
                      border: '1px solid var(--border)', 
                      color: 'var(--text-primary)', 
                      fontSize: '11px',
                      padding: '8px 12px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke={isComfortable ? "var(--accent)" : "var(--danger)"} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorFloor)" 
                  />
                  {hasRiskOfNegative && (
                    <ReferenceLine 
                      y={0} 
                      stroke="var(--danger)" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Accordéon pliable pour la liste des échéances */}
        <div className="border-t border-border/20 pt-3 mt-1">
          <button
            onClick={() => setIsAccordionExpanded(!isAccordionExpanded)}
            className="w-full flex justify-between items-center py-2 text-xs font-bold text-primary focus:outline-none"
            aria-expanded={isAccordionExpanded}
          >
            <span className="flex items-center gap-2">
              Échéances attendues d'ici la paye
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-surface text-secondary border border-border/40 font-premium-numbers">
                {pendingRecurringExpenses.length}
              </span>
            </span>
            {isAccordionExpanded ? (
              <ChevronUp size={16} className="text-secondary" />
            ) : (
              <ChevronDown size={16} className="text-secondary" />
            )}
          </button>

          {isAccordionExpanded && (
            <div className="space-y-2 mt-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar animate-none">
              {pendingRecurringExpenses.length === 0 ? (
                <div className="text-center py-6 text-muted text-xs border border-dashed border-border/20 rounded-2xl bg-surface/10">
                  Aucune charge planifiée détectée d'ici la paye.
                </div>
              ) : (
                pendingRecurringExpenses.map(tx => {
                  const isExcluded = excludedIds.includes(tx._id);
                  const catColor = tx.categoryId?.color || '#a1a1aa';
                  const catIcon = tx.categoryId?.icon || '🔁';
                  
                  return (
                    <div 
                      key={tx._id} 
                      onClick={() => toggleExpenseExclusion(tx._id)}
                      className={`min-h-[48px] py-2.5 px-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                        isExcluded 
                          ? 'bg-surface/20 border-border/20 opacity-50' 
                          : 'bg-surface border-border/40 active:scale-[0.99] active:border-border/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox Tactile (Cible large via le parent click) */}
                        <div className="p-1 text-secondary focus:outline-none">
                          {isExcluded ? (
                            <CheckCircle2 size={18} className="text-accent" />
                          ) : (
                            <Circle size={18} className="text-muted hover:text-secondary" />
                          )}
                        </div>

                        {/* Catégorie Icône */}
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border border-border/10"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                        >
                          {catIcon}
                        </div>

                        {/* Description & Date */}
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate max-w-[130px] leading-tight ${
                            isExcluded ? 'line-through text-muted' : 'text-primary'
                          }`}>
                            {tx.description}
                          </p>
                          <p className="text-[9px] text-muted">
                            Le {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>

                      {/* Montant */}
                      <span className={`text-xs font-bold font-premium-numbers shrink-0 ${
                        isExcluded ? 'text-muted' : 'text-primary'
                      }`}>
                        -{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default FloorBalanceWidget;
