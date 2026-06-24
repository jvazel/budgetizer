import React from 'react';

const MiniCalendar = ({ currentDate, selectedDate, onSelectDate, transactions = [] }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get number of days in current month
  const numDays = new Date(year, month + 1, 0).getDate();

  // Get first day of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  let firstDayIndex = new Date(year, month, 1).getDay();
  // Adjust to make Monday the first day (0 = Monday, ..., 6 = Sunday)
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysOfWeek = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  // Days array for calendar grid (adjacent months filled)
  const days = [];
  
  // Previous month padding
  const prevMonthDaysCount = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDayIndex; i++) {
    const dayNum = prevMonthDaysCount - firstDayIndex + 1 + i;
    days.push(new Date(year, month - 1, dayNum));
  }
  
  // Current month
  for (let i = 1; i <= numDays; i++) {
    days.push(new Date(year, month, i));
  }
  
  // Next month padding to reach standard 42-day (6 rows) grid
  const totalSlots = 42;
  const remaining = totalSlots - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  // Helper to check transactions for a given date
  const getDayTransactions = (date) => {
    if (!date) return [];
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getDate() === date.getDate() &&
             txDate.getMonth() === date.getMonth() &&
             txDate.getFullYear() === date.getFullYear();
    });
  };

  const isFuture = (date) => {
    if (!date) return false;
    const today = new Date();
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return compareDate.getTime() > compareToday.getTime();
  };

  const getDots = (date) => {
    if (!date) return null;
    const txs = getDayTransactions(date);
    if (txs.length === 0) {
      if (isFuture(date) && date.getMonth() === month) {
        return (
          <div className="flex gap-1 items-center justify-center mt-1 h-1.5 animate-fadeIn">
            <span className="rounded-full bg-accent/40 w-1.5 h-1.5" title="Aucune charge prévue" />
          </div>
        );
      }
      return null;
    }

    let hasIncome = false;
    let hasExpense = false;
    let totalIncome = 0;
    let totalExpense = 0;

    txs.forEach(t => {
      if (t.type === 'income') {
        hasIncome = true;
        totalIncome += t.amount;
      } else if (t.type === 'expense' || t.type === 'transfer') {
        hasExpense = true;
        totalExpense += t.amount;
      }
    });

    const getDotSizeClass = (amount) => {
      if (amount < 100) return 'w-1 h-1';
      return 'w-1.5 h-1.5';
    };

    return (
      <div className="flex gap-1 items-center justify-center mt-1 h-1.5">
        {hasExpense && (
          <span className={`rounded-full bg-danger ${getDotSizeClass(totalExpense)} transition-all`} />
        )}
        {hasIncome && (
          <span className={`rounded-full bg-accent ${getDotSizeClass(totalIncome)} transition-all`} />
        )}
      </div>
    );
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="bg-surface-2/80 backdrop-blur-md border border-border/40 rounded-[28px] p-4 shadow-md">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2.5 text-center">
        {daysOfWeek.map((d, idx) => {
          const isWeekendHeader = idx === 5 || idx === 6;
          return (
            <span 
              key={d} 
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isWeekendHeader ? 'text-danger/80' : 'text-muted/70'
              }`}
            >
              {d}
            </span>
          );
        })}
      </div>

      {/* Grid cells */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date) => {
          const selected = isSelected(date);
          const today = isToday(date);
          const isCurrentMonth = date.getMonth() === month;
          const futureNoCharge = !selected && !today && isCurrentMonth && isFuture(date) && getDayTransactions(date).length === 0;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={`h-11 flex flex-col items-center justify-center rounded-xl relative transition-all active:scale-95 ${
                selected 
                  ? 'bg-copper text-white shadow-[0_4px_12px_rgba(217,119,6,0.35)] font-bold z-10' 
                  : today 
                    ? 'border border-copper/50 text-copper font-bold' 
                    : futureNoCharge
                      ? isWeekend
                        ? 'bg-danger/[0.03] text-danger font-semibold border border-danger/10 hover:bg-danger/[0.08]'
                        : 'bg-accent/[0.03] text-accent font-semibold border border-accent/10 hover:bg-accent/[0.08]'
                      : !isCurrentMonth
                        ? isWeekend
                          ? 'text-danger/30 opacity-40 hover:bg-surface/50 font-medium'
                          : 'text-primary/20 opacity-40 hover:bg-surface/50'
                        : isWeekend
                          ? 'text-danger font-semibold hover:bg-surface'
                          : 'text-primary hover:bg-surface'
              }`}
            >
              <span className="text-xs sm:text-sm">{date.getDate()}</span>
              {!selected && getDots(date)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
