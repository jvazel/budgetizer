import React from 'react';
import { Edit2, Trash2, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

const SavingsGoalCard = ({ goal, onEdit, onDelete, onDeposit, onWithdraw }) => {
  const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const roundedPct = Math.round(percentage);
  const cappedPct = Math.min(percentage, 100);

  // Financial formatter
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Date helpers
  const targetDateObj = new Date(goal.targetDate);
  const formattedTargetDate = targetDateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Calculate days/months remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = targetDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const monthsRemaining = diffDays / 30.44;

  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const isOverdue = diffDays < 0 && !isCompleted;

  // Calculate suggested monthly savings
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  let monthlySuggestion = null;
  if (remainingAmount > 0) {
    if (monthsRemaining > 0) {
      monthlySuggestion = remainingAmount / monthsRemaining;
    } else {
      // Goal is passed or due today, must save whole remaining amount
      monthlySuggestion = remainingAmount;
    }
  }

  // Color theme
  let progressColor: string;
  let textColor: string;
  
  if (isCompleted) {
    progressColor = 'bg-emerald-400';
    textColor = 'text-emerald-400';
  } else if (isOverdue) {
    progressColor = 'bg-danger';
    textColor = 'text-danger';
  } else {
    progressColor = 'bg-blue-400';
    textColor = 'text-blue-400';
  }

  return (
    <div className="bg-surface-2 p-5 rounded-[16px] mb-5 border border-border/40 relative group overflow-hidden shadow-sm hover:border-border transition-colors">
      
      {/* Complete/Badge Banner */}
      {isCompleted && (
        <div className="absolute -right-12 -top-1 px-10 py-1.5 bg-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-widest rotate-45 border border-emerald-500/10">
          Complété
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* Goal Icon */}
        <div
          onClick={() => onEdit && onEdit(goal)}
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 shadow-sm cursor-pointer bg-surface-3 border border-border/30 active-scale-md"
          style={{ backgroundColor: `${goal.color || '#3b82f6'}15`, border: `1px solid ${goal.color || '#3b82f6'}30` }}
        >
          {goal.icon || '💰'}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 space-y-3">
          
          {/* Header Row */}
          <div>
            <h3 className="text-sm font-bold text-primary truncate leading-tight pr-8">{goal.name}</h3>
            <div className="flex items-center gap-1 text-[10px] text-secondary font-semibold mt-0.5">
              <Calendar size={11} className="text-muted" />
              <span>Cible : {formattedTargetDate}</span>
              {diffDays > 0 ? (
                <span className="text-muted">({Math.ceil(diffDays)} jours restants)</span>
              ) : diffDays === 0 ? (
                <span className="text-amber-400">(Aujourd'hui !)</span>
              ) : (
                <span className="text-danger">(Dépassé de {Math.abs(diffDays)} j.)</span>
              )}
            </div>
          </div>

          {/* Progress Percent row */}
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-muted">{formatCurrency(goal.currentAmount)}</span>
            <span className={`${textColor} text-sm font-premium-numbers font-extrabold tracking-tight`}>{roundedPct}%</span>
            <span className="text-muted">{formatCurrency(goal.targetAmount)}</span>
          </div>

          {/* Progress Bar */}
          <div className="h-4 w-full bg-surface border border-border/30 rounded-lg overflow-hidden relative">
            <div
              className={`h-full ${progressColor} rounded-lg transition-all duration-700 ease-out`}
              style={{ width: `${cappedPct}%` }}
            />
          </div>

          {/* Detailed metrics & Monthly suggestion */}
          <div className="pt-2 border-t border-border/20 flex flex-col gap-1 text-[10px] font-bold text-secondary">
            {!isCompleted ? (
              <div className="flex justify-between">
                <span>Reste à économiser :</span>
                <span className="text-primary font-premium-numbers">{formatCurrency(remainingAmount)}</span>
              </div>
            ) : (
              <div className="text-emerald-400 font-extrabold flex justify-between">
                <span>Félicitations ! Objectif atteint.</span>
                <span className="font-premium-numbers">{formatCurrency(goal.currentAmount)}</span>
              </div>
            )}

            {monthlySuggestion !== null && (
              <div className="flex justify-between items-center bg-surface-3/50 px-2 py-1 rounded-lg mt-1 text-[9px]">
                <span className="text-muted uppercase tracking-wider">Versement mensuel suggéré :</span>
                <span className="text-accent font-extrabold font-premium-numbers">{formatCurrency(monthlySuggestion)} / mois</span>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onDeposit(goal)}
              className="flex-1 py-2 px-3 bg-accent/10 hover:bg-accent/15 text-accent text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active-scale-sm"
            >
              <ArrowDownRight size={13} />
              <span>Verser</span>
            </button>
            <button
              onClick={() => onWithdraw(goal)}
              className="flex-1 py-2 px-3 bg-surface-3 hover:bg-surface-3/80 text-secondary hover:text-primary text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active-scale-sm"
            >
              <ArrowUpRight size={13} />
              <span>Retirer</span>
            </button>
          </div>

        </div>
      </div>

      {/* Floating Action Buttons (Modify / Delete) */}
      <div className="absolute top-4 right-4 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-surface-2/95 backdrop-blur-sm p-1 rounded-xl border border-border/40 shadow-sm z-10">
        <button 
          onClick={() => onEdit(goal)} 
          className="p-1.5 text-secondary hover:text-amber-400 hover:bg-surface rounded-lg transition-colors"
          title="Modifier l'objectif"
        >
          <Edit2 size={13} />
        </button>
        <button 
          onClick={() => {
            if (window.confirm('Supprimer cet objectif d\'épargne ?')) {
              onDelete(goal._id);
            }
          }} 
          className="p-1.5 text-danger/80 hover:text-danger hover:bg-surface rounded-lg transition-colors"
          title="Supprimer l'objectif"
        >
          <Trash2 size={13} />
        </button>
      </div>

    </div>
  );
};

export default SavingsGoalCard;
