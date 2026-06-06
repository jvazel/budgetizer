import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { useFinancialScoreHistory } from '../hooks/useFinancialScore';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const getGradeColor = (grade) => {
  switch (grade) {
    case 'A': return 'text-accent';
    case 'B': return 'text-info';
    case 'C': return 'text-warning';
    case 'D': return 'text-danger';
    default:  return 'text-muted';
  }
};

const getGradeBg = (grade) => {
  switch (grade) {
    case 'A': return 'bg-accent/10 border-accent/30';
    case 'B': return 'bg-info/10 border-info/30';
    case 'C': return 'bg-warning/10 border-warning/30';
    case 'D': return 'bg-danger/10 border-danger/30';
    default:  return 'bg-surface-2 border-border/40';
  }
};

const getScoreBarColor = (score) => {
  if (score >= 80) return 'var(--accent)';
  if (score >= 60) return 'var(--info)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
};

const PillarRow = ({ label, score, maxScore, detail, applicable = true }) => {
  if (!applicable) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-secondary font-medium flex-1 truncate">{label}</span>
        <span className="text-[10px] text-muted italic">Non applicable</span>
      </div>
    );
  }

  const pct = maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0;
  const barColor = pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-secondary font-medium truncate">{label}</span>
        <span className="text-[11px] font-bold text-primary shrink-0">
          {score !== null ? `${score} / ${maxScore}` : '—'}
        </span>
      </div>
      <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      {detail && (
        <p className="text-[10px] text-muted leading-snug">{detail}</p>
      )}
    </div>
  );
};

const BonusGoalStatus = ({ status }) => {
  const map = {
    ahead:   { label: 'En avance',      color: 'text-accent',   icon: TrendingUp },
    ontrack: { label: 'Dans les temps', color: 'text-info',     icon: Minus },
    behind:  { label: 'En retard',      color: 'text-danger',   icon: TrendingDown },
  };
  const { label, color, icon: Icon } = map[status] || map.behind;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold ${color}`}>
      <Icon size={11} /> {label}
    </span>
  );
};

const ScoreCard = ({ scoreData, prevScore }) => {
  const [expanded, setExpanded] = useState(false);

  const [yearStr, monthStr] = scoreData.monthKey.split('-');
  const monthLabel = `${MONTH_NAMES[parseInt(monthStr) - 1]} ${yearStr}`;

  const variation = prevScore !== null && prevScore !== undefined
    ? scoreData.score - prevScore
    : null;

  const { pillars, savingsGoalsBonus } = scoreData;

  const pillarRows = [
    {
      key: 'savingsRate',
      label: 'Taux d\'épargne',
      score: pillars.savingsRate.score,
      maxScore: pillars.savingsRate.maxScore,
      detail: `Taux : ${pillars.savingsRate.savingsRate}% — Revenus : ${pillars.savingsRate.income.toFixed(0)} € — Dépenses conso : ${pillars.savingsRate.expenses.toFixed(0)} €`,
      applicable: true,
    },
    {
      key: 'budgets',
      label: 'Respect des budgets',
      score: pillars.budgets.score,
      maxScore: pillars.budgets.maxScore,
      detail: pillars.budgets.applicable
        ? `Budget total : ${pillars.budgets.totalBudget.toFixed(0)} € — Dépassement : ${pillars.budgets.totalOverrun.toFixed(0)} €`
        : null,
      applicable: pillars.budgets.applicable,
    },
    {
      key: 'fixedCharges',
      label: 'Charges fixes / Revenus',
      score: pillars.fixedCharges.score,
      maxScore: pillars.fixedCharges.maxScore,
      detail: `Charges fixes : ${pillars.fixedCharges.fixedCharges.toFixed(0)} € — Ratio : ${pillars.fixedCharges.ratio}%`,
      applicable: true,
    },
    {
      key: 'patrimony',
      label: 'Évolution du patrimoine',
      score: pillars.patrimony.score,
      maxScore: pillars.patrimony.maxScore,
      detail: pillars.patrimony.patrimoineStart !== null
        ? `Début : ${pillars.patrimony.patrimoineStart.toFixed(0)} € → Fin : ${pillars.patrimony.patrimoineEnd?.toFixed(0)} €`
        : 'Premier mois — pas d\'historique',
      applicable: true,
    },
    {
      key: 'cushion',
      label: 'Matelas de sécurité',
      score: pillars.cushion.score,
      maxScore: pillars.cushion.maxScore,
      detail: pillars.cushion.fixedCharges > 0
        ? `Charges fixes de référence : ${pillars.cushion.fixedCharges.toFixed(0)} €`
        : 'Aucune charge fixe détectée',
      applicable: true,
    },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-primary px-1">{monthLabel}</h4>

      <div className="bg-surface-2 rounded-[24px] border border-border/40 shadow-sm overflow-hidden">
        {/* Score Header Row */}
        <div
          className="p-5 flex items-center gap-4 cursor-pointer hover:bg-surface/30 transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Grade Badge */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-extrabold border shrink-0 ${getGradeBg(scoreData.grade)} ${getGradeColor(scoreData.grade)}`}>
            {scoreData.grade}
          </div>

          {/* Score + Bar */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-primary">{scoreData.score}</span>
                <span className="text-xs text-muted font-semibold">/100</span>
                {scoreData.bonusScore > 0 && (
                  <span className="text-xs font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-lg">
                    +{scoreData.bonusScore} bonus
                  </span>
                )}
              </div>
              {variation !== null && (
                <div className={`flex items-center gap-0.5 text-xs font-bold shrink-0 ${
                  variation > 0 ? 'text-accent' : variation < 0 ? 'text-danger' : 'text-muted'
                }`}>
                  {variation > 0 ? <TrendingUp size={13} /> : variation < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                  {variation > 0 ? '+' : ''}{variation} pts
                </div>
              )}
            </div>
            <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${scoreData.score}%`, backgroundColor: getScoreBarColor(scoreData.score) }}
              />
            </div>
          </div>

          {/* Expand chevron */}
          <div className="text-muted shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Accordion Detail */}
        {expanded && (
          <div className="px-5 pb-5 pt-0 border-t border-border/20 space-y-4">
            {/* Pillars */}
            <div className="space-y-3 pt-4">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Détail des 5 piliers</p>
              {pillarRows.map(row => (
                <PillarRow key={row.key} {...row} />
              ))}
            </div>

            {/* Bonus */}
            {savingsGoalsBonus.goals.length > 0 && (
              <div className="pt-3 border-t border-border/20 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={11} /> Bonus objectifs
                  </p>
                  <span className={`text-xs font-extrabold ${
                    savingsGoalsBonus.bonusScore > 0 ? 'text-accent' : 'text-muted'
                  }`}>
                    +{savingsGoalsBonus.bonusScore} / 5 pts
                  </span>
                </div>
                {savingsGoalsBonus.goals.map(g => (
                  <div key={g.goalId} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-secondary font-medium truncate">{g.name}</span>
                    <BonusGoalStatus status={g.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FinancialScoresPage = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { scores, availableYears, loading, error, refreshHistory } = useFinancialScoreHistory(selectedYear);

  return (
    <>
      <HeaderTitle>Scores financiers</HeaderTitle>
      <HeaderBackButton to="/" />

      {/* Year Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 mb-6">
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${
              selectedYear === year
                ? 'bg-accent text-white border-accent shadow-[0_4px_12px_rgba(74,222,128,0.25)]'
                : 'bg-surface-2 text-secondary border-border/40 hover:text-primary hover:border-border'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center py-8 bg-danger/10 border border-danger/20 rounded-[24px] mb-6 p-4">
          <p className="text-danger text-sm font-semibold">{error}</p>
          <button
            onClick={refreshHistory}
            className="mt-3 text-xs font-bold text-primary underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 bg-surface-2 w-36 rounded-full" />
              <div className="bg-surface-2 rounded-[24px] border border-border/20 h-[96px]" />
            </div>
          ))}
        </div>
      ) : scores.length === 0 ? (
        /* Empty */
        <div className="text-center py-16 bg-surface-2 rounded-[28px] border border-dashed border-border/40">
          <Award size={32} className="mx-auto text-muted/50 mb-3" />
          <p className="text-muted text-sm font-medium mb-1">Aucune donnée disponible</p>
          <p className="text-muted text-xs">Ajoutez des transactions pour calculer votre score.</p>
        </div>
      ) : (
        /* Scores List */
        <div className="space-y-6">
          {scores.map((scoreData, idx) => {
            // Previous score = next item in array (older month) for variation display
            const prevScore = scores[idx + 1]?.score ?? null;
            return (
              <ScoreCard
                key={scoreData.monthKey}
                scoreData={scoreData}
                prevScore={prevScore}
              />
            );
          })}
        </div>
      )}
    </>
  );
};

export default FinancialScoresPage;
