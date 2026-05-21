import { Edit2, Trash2 } from 'lucide-react';

const BudgetCard = ({ budget, onEdit, onDelete, selectedWeekStart, selectedMonth, selectedYear }) => {
  const percentage = Math.round(budget.percentage);
  const cappedPercentage = Math.min(percentage, 100);

  // 1. Color System based on progress
  let barColor = 'bg-accent'; // Vert
  let textColor = 'text-accent';
  if (budget.percentage >= 70 && budget.percentage < 90) {
    barColor = 'bg-warning'; // Orange
    textColor = 'text-warning';
  } else if (budget.percentage >= 90) {
    barColor = 'bg-danger'; // Rouge
    textColor = 'text-danger';
  }

  const isOverBudget = budget.percentage >= 100;

  // Helpers for financial formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // 2. Calculate dynamic period dates
  const getPeriodDates = () => {
    const period = budget.period || 'monthly';

    if (period === 'weekly') {
      const targetWeekStart = selectedWeekStart;
      if (!targetWeekStart) {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(today.setDate(diff));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        const pad = (n) => String(n).padStart(2, '0');
        return {
          start: `${pad(mon.getDate())}/${pad(mon.getMonth() + 1)}/${mon.getFullYear()}`,
          end: `${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()}`
        };
      }
      const [year, month, day] = targetWeekStart.split('-').map(Number);
      const mon = new Date(year, month - 1, day);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const pad = (n) => String(n).padStart(2, '0');
      return {
        start: `${pad(day)}/${pad(month)}/${year}`,
        end: `${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()}`
      };
    }

    if (period === 'yearly') {
      const targetYear = selectedYear;
      if (!targetYear) {
        const today = new Date();
        return { start: `01/01/${today.getFullYear()}`, end: `31/12/${today.getFullYear()}` };
      }
      return { start: `01/01/${targetYear}`, end: `31/12/${targetYear}` };
    }

    // Default / Monthly
    const targetMonth = selectedMonth || budget.month;
    if (!targetMonth) {
      const today = new Date();
      return { start: `01/01/${today.getFullYear()}`, end: `31/01/${today.getFullYear()}` };
    }
    const [year, month] = targetMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const pad = (n) => String(n).padStart(2, '0');
    return {
      start: `01/${pad(month)}/${year}`,
      end: `${pad(daysInMonth)}/${pad(month)}/${year}`
    };
  };

  // 3. Calculate temporal marker progression
  const getTemporalProgress = () => {
    const period = budget.period || 'monthly';

    if (period === 'weekly') {
      const targetWeekStart = selectedWeekStart;
      let mon;
      if (!targetWeekStart) {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        mon = new Date(today.setDate(diff));
      } else {
        const [year, month, day] = targetWeekStart.split('-').map(Number);
        mon = new Date(year, month - 1, day);
      }
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      const today = new Date();
      if (today < mon) return 0;
      if (today > sun) return 100;
      return ((today.getTime() - mon.getTime()) / (7 * 24 * 60 * 60 * 1000)) * 100;
    }

    if (period === 'yearly') {
      const targetYear = Number(selectedYear) || new Date().getFullYear();
      const today = new Date();
      const currentYear = today.getFullYear();

      if (targetYear < currentYear) return 100;
      if (targetYear > currentYear) return 0;

      const yearStart = new Date(targetYear, 0, 1);
      const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59, 999);
      return ((today.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())) * 100;
    }

    // Default / Monthly
    const targetMonth = selectedMonth || budget.month;
    if (!targetMonth) return 50; // middle default
    const [year, month] = targetMonth.split('-').map(Number);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return 100; // Past month has fully passed
    }
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return 0; // Future month has not started
    }
    // Current month: calculate fraction
    const currentDate = today.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    return (currentDate / daysInMonth) * 100;
  };

  const dates = getPeriodDates();
  const temporalProgress = getTemporalProgress();

  return (
    <div className="bg-surface-2 p-5 rounded-[28px] mb-5 border border-border/40 relative group overflow-hidden shadow-sm hover:border-border transition-colors">
      <div className="flex gap-4 items-start">
        
        {/* Category Icon */}
        <div
          onClick={onEdit ? () => onEdit(budget) : undefined}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 shadow-sm ${onEdit ? 'transition-transform active:scale-95 cursor-pointer' : 'cursor-default'}`}
          style={{ backgroundColor: `${budget.color || '#3b82f6'}20`, border: `1px solid ${budget.color || '#3b82f6'}30` }}
        >
          {budget.categoryId?.icon || '📦'}
        </div>

        {/* Content Right Stack */}
        <div className="flex-1 min-w-0 space-y-2">
          
          {/* Header Row */}
          <div>
            <h3 className="text-sm font-bold text-primary truncate leading-tight">{budget.name}</h3>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{budget.categoryId?.name || 'Toutes catégories'}</p>
          </div>

          {/* Date and Percentage Row */}
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-muted">{dates.start}</span>
            <span className={`${textColor} text-sm font-mono font-extrabold tracking-tight`}>{percentage}%</span>
            <span className="text-muted">{dates.end}</span>
          </div>

          {/* Progress Bar Container — includes today marker above */}
          <div className="relative pt-3">

            {/* Today tick marker (above the bar) */}
            {temporalProgress > 1 && temporalProgress < 99 && (
              <div
                className="absolute top-0 flex flex-col items-center z-20"
                style={{ left: `calc(${temporalProgress}% - 1px)` }}
                title="Aujourd'hui"
              >
                {/* Triangle arrow pointing down */}
                <div className="w-0 h-0" style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid rgba(255,255,255,0.8)'
                }} />
              </div>
            )}

            {/* Progress Bar */}
            <div className="h-4 w-full bg-surface border border-border/30 rounded-lg overflow-hidden relative">
              {/* Spent fill */}
              <div
                className={`h-full ${barColor} ${isOverBudget ? 'animate-pulse' : ''} rounded-lg transition-all duration-700 ease-out`}
                style={{ width: `${cappedPercentage}%` }}
              />

              {/* Today vertical line inside bar */}
              {temporalProgress > 1 && temporalProgress < 99 && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white/75 shadow-lg z-10"
                  style={{ left: `${temporalProgress}%` }}
                />
              )}
            </div>

            {/* Amounts row aligned under the bar */}
            <div className="relative flex justify-between items-center mt-2 h-4 text-[10px] font-bold">
              <span className="text-muted">0 €</span>

              {/* Spent marker centered */}
              {budget.spent > 0 && (
                <span
                  className={`text-[11px] font-mono font-extrabold ${textColor} absolute left-1/2 -translate-x-1/2`}
                >
                  {formatCurrency(budget.spent)}
                </span>
              )}

              <span className="text-primary font-bold">{formatCurrency(budget.amount)}</span>
            </div>
          </div>

          {/* Residual/Exceeded Info Row */}
          <div className="pt-2 border-t border-border/20 flex items-center justify-between">
            {isOverBudget ? (
              <span className="text-[11px] font-bold text-danger flex items-center gap-1">
                ⚠️ Dépassement : {formatCurrency(budget.spent - budget.amount)}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-secondary">
                Montant résiduel : {formatCurrency(budget.remaining)}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Floating Action Buttons for Card */}
      {onEdit && onDelete && (
        <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-2/90 backdrop-blur-sm p-1 rounded-xl border border-border/40 shadow-sm">
          <button 
            onClick={() => onEdit(budget)} 
            className="p-1.5 text-secondary hover:text-amber-400 hover:bg-surface rounded-lg transition-colors"
            title="Modifier le budget"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Supprimer ce budget ?')) {
                onDelete(budget._id);
              }
            }} 
            className="p-1.5 text-danger/80 hover:text-danger hover:bg-surface rounded-lg transition-colors"
            title="Supprimer le budget"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default BudgetCard;
