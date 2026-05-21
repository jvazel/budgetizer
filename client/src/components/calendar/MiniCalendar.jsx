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

  // Days array for calendar grid
  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null); // empty spots before the 1st
  }
  for (let i = 1; i <= numDays; i++) {
    days.push(new Date(year, month, i));
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

  const getDots = (date) => {
    if (!date) return null;
    const txs = getDayTransactions(date);
    if (txs.length === 0) return null;

    let hasIncome = false;
    let hasExpense = false;
    let totalIncome = 0;
    let totalExpense = 0;

    txs.forEach(t => {
      if (t.type === 'income') {
        hasIncome = true;
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        hasExpense = true;
        totalExpense += t.amount;
      }
    });

    const getDotSizeClass = (amount) => {
      if (amount < 50) return 'w-1 h-1';
      if (amount < 200) return 'w-1.5 h-1.5';
      return 'w-2 h-2';
    };

    return (
      <div className="flex gap-1 items-center justify-center mt-1 h-2">
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
    <div className="bg-surface-2 border border-border/40 rounded-3xl p-4 shadow-sm">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {daysOfWeek.map(d => (
          <span key={d} className="text-xs font-bold text-muted uppercase tracking-wider">{d}</span>
        ))}
      </div>

      {/* Grid cells */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="h-12" />;

          const selected = isSelected(date);
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={`h-12 flex flex-col items-center justify-center rounded-2xl relative transition-all active:scale-95 ${
                selected 
                  ? 'bg-accent text-white shadow-[0_4px_12px_rgba(74,222,128,0.2)] font-bold' 
                  : today 
                    ? 'border-2 border-accent text-accent font-bold' 
                    : 'text-primary hover:bg-surface'
              }`}
            >
              <span className="text-sm">{date.getDate()}</span>
              {!selected && getDots(date)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
