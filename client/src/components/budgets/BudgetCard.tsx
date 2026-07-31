import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import AmountDisplay from '../ui/AmountDisplay';

const BudgetCard = ({ budget, onEdit, onDelete, selectedWeekStart, selectedMonth, selectedYear }) => {
  const percentage = Math.round(budget.percentage);
  const cappedPercentage = Math.min(percentage, 100);

  // 1. Color System based on progress with Neobank Liquid Glows
  let barGradient = 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow-emerald'; // Vert Émeraude / Cyan
  let textColor = 'text-emerald-700 dark:text-emerald-400';
  let borderLeftClass = 'border-l-4 border-l-emerald-500';
  if (budget.percentage >= 70 && budget.percentage < 90) {
    barGradient = 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'; // Orange
    textColor = 'text-amber-700 dark:text-amber-400';
    borderLeftClass = 'border-l-4 border-l-amber-500';
  } else if (budget.percentage >= 90) {
    barGradient = 'bg-gradient-to-r from-rose-500 to-red-600 shadow-glow-rose'; // Rouge Néon
    textColor = 'text-rose-700 dark:text-rose-400';
    borderLeftClass = 'border-l-4 border-l-rose-500';
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
    <div 
      onClick={onEdit ? () => onEdit(budget) : undefined}
      className={`bg-surface-2 p-5 rounded-[24px] mb-4 border border-border/40 relative group overflow-hidden shadow-sm hover:border-border/80 transition-all ${borderLeftClass} ${onEdit ? 'cursor-pointer active-scale-sm' : ''}`}
    >
      <div className="flex gap-4 items-start">
        
        {/* Category Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-border/10"
          style={{ backgroundColor: `${budget.color || '#3b82f6'}15`, color: budget.color || '#3b82f6' }}
        >
          {budget.categoryId?.icon || '📦'}
        </div>

        {/* Content Right Stack */}
        <div className="flex-1 min-w-0 space-y-3">
          
          {/* Header Row */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-primary truncate leading-tight">{budget.name}</h3>
                {budget.isShared && (
                  <span className="text-[8px] font-extrabold bg-accent/15 text-accent px-1.5 py-0.5 rounded-md flex items-center gap-0.5" title={`Partagé par ${budget.ownerName}`}>
                    👥 {budget.ownerName}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">{budget.categoryId?.name || 'Toutes catégories'}</p>
            </div>
            <span className={`${textColor} text-sm font-premium-numbers font-extrabold tracking-tight shrink-0`}>{percentage}%</span>
          </div>

          {/* Progress Bar Container */}
          <div className="relative">

            {/* Progress Bar (Neobank Glow Bar) */}
            <div className="h-3 w-full bg-black/30 border border-white/10 rounded-full overflow-hidden relative backdrop-blur-md">
              {/* Spent fill with Liquid Glow */}
              <div
                className={`h-full ${barGradient} ${isOverBudget ? 'animate-pulse' : ''} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${cappedPercentage}%` }}
              />

              {/* Today vertical line inside bar */}
              {temporalProgress > 1 && temporalProgress < 99 && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] z-10"
                  style={{ left: `${temporalProgress}%` }}
                  title="Aujourd'hui"
                />
              )}
            </div>

            {/* Amounts row aligned under the bar */}
            <div className="flex justify-between items-center mt-2 text-[10px] font-medium text-secondary">
              <div className="flex items-center gap-1">
                <span>Dépensé :</span>
                <AmountDisplay amount={budget.spent} size="xs" type={budget.percentage >= 90 ? 'expense' : 'neutral'} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted">Limite :</span>
                <AmountDisplay amount={budget.amount} size="xs" type="neutral" />
              </div>
            </div>
          </div>

          {/* Bottom Info & Dates */}
          <div className="pt-2 border-t border-border/20 flex flex-wrap items-center justify-between gap-1">
            {isOverBudget ? (
              <span className="text-[10px] font-bold text-danger flex items-center gap-1 font-premium-numbers">
                ⚠️ Dépassement : <AmountDisplay amount={budget.spent - budget.amount} size="xs" type="expense" />
              </span>
            ) : (
              <span className="text-[10px] font-bold text-secondary font-premium-numbers flex items-center gap-1">
                Reste : <AmountDisplay amount={budget.remaining} size="xs" type="income" />
              </span>
            )}
            <span className="text-[9px] font-medium text-muted">
              du {dates.start} au {dates.end}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BudgetCard;
