import React, { useState, useEffect, useMemo } from 'react';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactions } from '../../hooks/useTransactions';
import { getDaysRemaining, getTargetVelocity, getActualVelocity, getDepletionDate } from '../../utils/velocityHelper';
import { AlertTriangle, CheckCircle2, ChevronDown, Flame, Info, ShieldCheck, HelpCircle } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

const VelocityChart = () => {
  const today = useMemo(() => new Date(), []);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 1. Calculer la période d'analyse des dépenses (7 derniers jours ou depuis le début du mois)
  const currentDay = today.getDate();
  const startOfPeriod = useMemo(() => {
    if (currentDay >= 7) {
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    } else {
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }
  }, [today, currentDay]);

  const daysCount = useMemo(() => {
    return currentDay >= 7 ? 7 : currentDay;
  }, [currentDay]);

  const monthStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [today]);

  const startDateStr = useMemo(() => {
    const y = startOfPeriod.getFullYear();
    const m = String(startOfPeriod.getMonth() + 1).padStart(2, '0');
    const d = String(startOfPeriod.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [startOfPeriod]);

  const endDateStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  // 2. Charger les budgets du mois en cours
  const { budgets, loading: budgetsLoading } = useBudgets({ month: monthStr });

  // 3. Charger les transactions de la période récente
  const { transactions, loading: txsLoading } = useTransactions({
    startDate: startDateStr,
    endDate: endDateStr,
    limit: 1000
  });

  const loading = budgetsLoading || txsLoading;

  // Filtrer les budgets mensuels uniquement
  const monthlyBudgets = useMemo(() => {
    return budgets.filter(b => b.period === 'monthly' || !b.period);
  }, [budgets]);

  // Options du sélecteur
  const categoryOptions = useMemo(() => {
    const options = [{ id: 'all', name: 'Toutes dépenses confondues', icon: '📊' }];
    monthlyBudgets.forEach(b => {
      const catId = b.categoryId?._id || b.categoryId;
      const catName = b.name || b.categoryId?.name || 'Sans nom';
      const catIcon = b.categoryId?.icon || '📁';
      if (catId && !options.some(opt => opt.id === catId)) {
        options.push({ id: catId, name: catName, icon: catIcon });
      }
    });
    return options;
  }, [monthlyBudgets]);

  const activeOption = useMemo(() => {
    return categoryOptions.find(opt => opt.id === selectedCategoryId) || categoryOptions[0];
  }, [categoryOptions, selectedCategoryId]);

  // Calculs financiers pour le tachymètre et les fiches d'insights
  const data = useMemo(() => {
    const daysRemaining = getDaysRemaining(today);
    let totalBudget = 0;
    let totalSpentInMonth = 0;
    let recentSpent = 0;

    if (selectedCategoryId === 'all') {
      totalBudget = monthlyBudgets.reduce((sum, b) => sum + b.amount, 0);
      totalSpentInMonth = monthlyBudgets.reduce((sum, b) => sum + b.spent, 0);
      recentSpent = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    } else {
      const targetBudget = monthlyBudgets.find(b => (b.categoryId?._id || b.categoryId) === selectedCategoryId);
      if (targetBudget) {
        totalBudget = targetBudget.amount;
        totalSpentInMonth = targetBudget.spent;
      }
      recentSpent = transactions
        .filter(t => t.type === 'expense' && (t.categoryId?._id || t.categoryId) === selectedCategoryId)
        .reduce((sum, t) => sum + t.amount, 0);
    }

    const remainingBudget = totalBudget - totalSpentInMonth;
    const targetVelocity = getTargetVelocity(remainingBudget, daysRemaining);
    const actualVelocity = getActualVelocity(recentSpent, daysCount);
    const depletionDate = getDepletionDate(remainingBudget, actualVelocity, today);

    return {
      daysRemaining,
      totalBudget,
      totalSpentInMonth,
      remainingBudget,
      targetVelocity,
      actualVelocity,
      depletionDate
    };
  }, [selectedCategoryId, monthlyBudgets, transactions, daysCount, today]);

  // Déterminer l'angle de l'aiguille du tachymètre
  // Nous voulons que targetVelocity soit au centre (90 degrés)
  const angle = useMemo(() => {
    if (data.targetVelocity <= 0) {
      return data.actualVelocity > 0 ? 180 : 0;
    }
    const ratio = data.actualVelocity / (2 * data.targetVelocity);
    return Math.min(180, Math.max(0, ratio * 180));
  }, [data.actualVelocity, data.targetVelocity]);

  // Coordonnées pour l'arc coloré de la jauge (rayon R = 85, centre = (120, 110))
  const arcPath = useMemo(() => {
    const R = 85;
    const cx = 120;
    const cy = 110;
    
    // Convertir l'angle de aiguille en coordonnées SVG
    const x = cx - R * Math.cos((angle * Math.PI) / 180);
    const y = cy - R * Math.sin((angle * Math.PI) / 180);

    return { x, y };
  }, [angle]);

  const formattedDepletionDate = useMemo(() => {
    if (!data.depletionDate) return '';
    return data.depletionDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [data.depletionDate]);

  return (
    <div className="space-y-6">
      {/* 1. Sélecteur de catégorie */}
      <div className="relative">
        <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block mb-1.5">
          Catégorie d'analyse
        </label>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full bg-surface-2 border border-border/40 hover:border-accent/40 rounded-2xl p-4 flex justify-between items-center transition-all select-none active:scale-[0.99] text-left"
        >
          <span className="flex items-center gap-2.5 font-semibold text-xs text-primary">
            <span className="text-base">{activeOption.icon}</span>
            {activeOption.name}
          </span>
          <ChevronDown size={16} className={`text-secondary transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute z-20 w-full mt-2 bg-elevated border border-border rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
            {categoryOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedCategoryId(opt.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full p-3.5 flex items-center gap-3 text-left font-medium text-xs transition-colors hover:bg-surface ${
                  selectedCategoryId === opt.id ? 'bg-accent/10 text-accent font-bold' : 'text-primary'
                }`}
              >
                <span className="text-base">{opt.icon}</span>
                <span>{opt.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-surface-2 p-10 rounded-[28px] border border-border/40 flex flex-col items-center justify-center min-h-[260px]">
          <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
        </div>
      ) : monthlyBudgets.length === 0 ? (
        <div className="bg-surface-2 p-8 rounded-[28px] border border-border/40 text-center flex flex-col items-center justify-center min-h-[220px] space-y-3">
          <HelpCircle size={32} className="text-muted" />
          <div>
            <h4 className="text-xs font-bold text-primary">Aucun budget défini</h4>
            <p className="text-[10px] text-secondary mt-1 max-w-[240px] leading-relaxed">
              Veuillez configurer un budget mensuel dans l'application pour utiliser le tachymètre de vélocité.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Jauge de vélocité */}
          <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm flex flex-col items-center select-none relative overflow-hidden">
            <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase mb-1 w-full text-center">
              Tachymètre : Rythme de vos dépenses
            </h3>
            <p className="text-[9px] text-muted mb-4 w-full text-center">
              Moyenne calculée sur les {daysCount} {daysCount > 1 ? 'derniers jours' : 'dernier jour'}
            </p>

            {/* Visualisation SVG */}
            <div className="relative w-full max-w-[240px] flex justify-center">
              <svg width="240" height="135" className="overflow-visible">
                {/* Zones de fond (Périphérie) */}
                {/* Zone verte (Gauche, 0 à 90°) */}
                <path
                  d="M 35 110 A 85 85 0 0 1 120 25"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeOpacity="0.12"
                  strokeLinecap="round"
                />
                {/* Zone rouge (Droite, 90 à 180°) */}
                <path
                  d="M 120 25 A 85 85 0 0 1 205 110"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="10"
                  strokeOpacity="0.12"
                  strokeLinecap="round"
                />

                {/* Arcs Actifs de progression */}
                {angle > 0 && (
                  angle <= 90 ? (
                    <path
                      d={`M 35 110 A 85 85 0 0 1 ${arcPath.x} ${arcPath.y}`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <path
                        d="M 35 110 A 85 85 0 0 1 120 25"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="10"
                      />
                      <path
                        d={`M 120 25 A 85 85 0 0 1 ${arcPath.x} ${arcPath.y}`}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="10"
                        strokeLinecap="round"
                      />
                    </>
                  )
                )}

                {/* Seuil : Limite de vitesse (Pointillés verticaux à 90°) */}
                <line
                  x1="120"
                  y1="110"
                  x2="120"
                  y2="20"
                  stroke="var(--text-secondary)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                
                {/* Aiguille rotative animée */}
                <line
                  x1="120"
                  y1="110"
                  x2="120"
                  y2="32"
                  stroke="var(--text-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{
                    transform: `rotate(${angle - 90}deg)`,
                    transformOrigin: '120px 110px',
                    transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                />

                {/* Pivot central */}
                <circle
                  cx="120"
                  cy="110"
                  r="7"
                  fill="var(--bg-surface-2)"
                  stroke="var(--text-primary)"
                  strokeWidth="2.5"
                />

                {/* Texte au centre */}
                <text x="120" y="86" textAnchor="middle" className="font-extrabold text-lg fill-primary font-premium-numbers">
                  {formatCurrency(data.actualVelocity)}
                </text>
                <text x="120" y="100" textAnchor="middle" className="text-[8px] font-bold fill-secondary uppercase tracking-wider">
                  / jour
                </text>
              </svg>

              {/* Petite bulle pour la limite de vitesse */}
              <div className="absolute top-0 right-8 text-[7px] font-extrabold uppercase tracking-wider text-secondary flex items-center gap-1 bg-surface-2 border border-border/30 px-1.5 py-0.5 rounded-full">
                <span>Limite</span>
              </div>
            </div>

            {/* Comparatif chiffré */}
            <div className="w-full border-t border-border/20 pt-4 mt-2 grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="premium-label block text-muted">Vitesse réelle</span>
                <span className="font-premium-numbers text-xs font-extrabold text-primary block mt-0.5">
                  {formatCurrency(data.actualVelocity)} <span className="text-[9px] font-normal text-muted">/ j</span>
                </span>
              </div>
              <div>
                <span className="premium-label block text-muted">Vitesse cible</span>
                <span className="font-premium-numbers text-xs font-extrabold text-primary block mt-0.5">
                  {formatCurrency(data.targetVelocity)} <span className="text-[9px] font-normal text-muted">/ j</span>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Bloc d'analyse textuel dynamique (Insights) */}
          <div className="space-y-3">
            {data.totalBudget === 0 ? (
              <div className="bg-surface-2 p-4 rounded-2xl border border-border/30 flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <Info size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-primary block">Aucun budget configuré</span>
                  <p className="text-[9px] text-secondary mt-0.5 leading-relaxed">
                    Aucun budget mensuel défini pour cette catégorie. Créez un budget pour pouvoir suivre votre rythme de dépenses conseillé.
                  </p>
                </div>
              </div>
            ) : data.actualVelocity <= data.targetVelocity ? (
              <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/15 flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-accent flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} className="text-accent" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-accent block">Vitesse sous contrôle</span>
                  <p className="text-[9px] text-secondary mt-0.5 leading-relaxed">
                    Votre rythme est excellent ! Vous dépensez en moyenne <strong className="text-primary">{formatCurrency(data.actualVelocity)}/jour</strong> pour une limite conseillée de <strong className="text-primary">{formatCurrency(data.targetVelocity)}/jour</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Alerte Excès de vitesse */}
                <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/15 flex gap-3.5 items-start">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 text-danger flex items-center justify-center shrink-0">
                    <Flame size={16} className="text-danger" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-danger block">⚠️ Excès de vitesse détecté</span>
                    <p className="text-[9px] text-secondary mt-0.5 leading-relaxed">
                      À ce rythme (<strong className="text-primary">{formatCurrency(data.actualVelocity)}/jour</strong> au lieu de <strong className="text-primary">{formatCurrency(data.targetVelocity)}/jour</strong>), votre budget sera totalement épuisé le <strong className="text-danger">{formattedDepletionDate}</strong> au lieu de la fin du mois.
                    </p>
                  </div>
                </div>

                {/* Action corrective proposée */}
                <div className="bg-info/5 p-4 rounded-2xl border border-info/15 flex gap-3.5 items-start">
                  <div className="w-8 h-8 rounded-full bg-info/10 text-info flex items-center justify-center shrink-0">
                    <Info size={16} className="text-info" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-info block">Action corrective proposée</span>
                    <p className="text-[9px] text-secondary mt-0.5 leading-relaxed">
                      {data.remainingBudget > 0 ? (
                        <>
                          Pour redresser la barre et respecter votre budget initial, limitez vos dépenses dans cette catégorie à <strong className="text-primary">{formatCurrency(data.newAdvisedLimit)}/jour</strong> pendant les <strong className="text-primary">{data.daysRemaining} jours</strong> restants.
                        </>
                      ) : (
                        <>
                          Votre budget étant entièrement consommé, limitez vos dépenses dans cette catégorie à <strong className="text-danger">0,00 €/jour</strong> pendant les <strong className="text-primary">{data.daysRemaining} jours</strong> restants pour éviter d'aggraver le dépassement.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex items-center gap-1.5 text-[8px] text-muted/80 font-bold px-1.5 mt-2">
              <ShieldCheck size={11} className="text-accent" />
              <span>Données synchronisées en temps réel</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VelocityChart;
