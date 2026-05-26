import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import BudgetCard from '../components/budgets/BudgetCard';
import BudgetFormSheet from '../components/budgets/BudgetFormSheet';
import { useBudgets } from '../hooks/useBudgets';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const Budgets = () => {
  // Initialize to Monday of current week
  const getInitialWeekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.getFullYear(), today.getMonth(), diff);
  };

  const [weekDate, setWeekDate] = useState(getInitialWeekStart());
  const [monthDate, setMonthDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [yearDate, setYearDate] = useState(new Date(new Date().getFullYear(), 0, 1));

  const formatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatMonthStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const formatYearStr = (date) => {
    return String(date.getFullYear());
  };

  const weekStartStr = formatDateStr(weekDate);
  const monthStr = formatMonthStr(monthDate);
  const yearStr = formatYearStr(yearDate);

  const { budgets, loading, addBudget, updateBudget, deleteBudget } = useBudgets({
    weekStart: weekStartStr,
    month: monthStr,
    year: yearStr
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const prevWeek = () => {
    setWeekDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const nextWeek = () => {
    setWeekDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const prevMonth = () => {
    setMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextMonth = () => {
    setMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const prevYear = () => {
    setYearDate(prev => {
      const d = new Date(prev);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    });
  };

  const nextYear = () => {
    setYearDate(prev => {
      const d = new Date(prev);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    });
  };

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (budget) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  const weeklyBudgets = budgets.filter(b => b.period === 'weekly');
  const monthlyBudgets = budgets.filter(b => b.period === 'monthly' || !b.period);
  const yearlyBudgets = budgets.filter(b => b.period === 'yearly');

  const renderSectionHeader = (title, onPrev, onNext) => (
    <div className="w-[calc(100%+32px)] bg-surface-2 text-primary py-3 px-4 flex justify-between items-center font-bold text-sm select-none border-y border-border mx-[-16px] mb-4">
      <button onClick={onPrev} className="p-1.5 hover:bg-surface text-secondary hover:text-primary rounded-xl active:scale-95 transition-all">
        <ChevronLeft size={18} />
      </button>
      <span className="text-xs font-bold uppercase tracking-wider text-primary">{title}</span>
      <button onClick={onNext} className="p-1.5 hover:bg-surface text-secondary hover:text-primary rounded-xl active:scale-95 transition-all">
        <ChevronRight size={18} />
      </button>
    </div>
  );

  const showSkeleton = loading && budgets.length === 0;

  return (
    <AppShell title="Budgets">
      <section className="pb-24">
        {/* Weekly Budgets Section */}
        <div className="mb-6">
          {renderSectionHeader("Budgets hebdomadaires", prevWeek, nextWeek)}
          {showSkeleton ? (
            <div className="space-y-4">
              <div className="h-[120px] bg-surface-2 rounded-2xl animate-pulse" />
            </div>
          ) : weeklyBudgets.length === 0 ? (
            <div className="text-center py-6 bg-surface-2/40 rounded-2xl border border-dashed border-border/60 mb-5">
              <p className="text-xs text-muted mb-2">Aucun budget hebdomadaire défini.</p>
              <button onClick={handleOpenAdd} className="text-xs text-accent font-bold hover:underline">Créer un budget hebdomadaire</button>
            </div>
          ) : (
            weeklyBudgets.map(budget => (
              <BudgetCard 
                key={budget._id} 
                budget={budget} 
                onEdit={handleOpenEdit}
                onDelete={deleteBudget}
                selectedWeekStart={weekStartStr}
              />
            ))
          )}
        </div>

        {/* Monthly Budgets Section */}
        <div className="mb-6">
          {renderSectionHeader("Budgets mensuels", prevMonth, nextMonth)}
          {showSkeleton ? (
            <div className="space-y-4">
              <div className="h-[120px] bg-surface-2 rounded-2xl animate-pulse" />
            </div>
          ) : monthlyBudgets.length === 0 ? (
            <div className="text-center py-6 bg-surface-2/40 rounded-2xl border border-dashed border-border/60 mb-5">
              <p className="text-xs text-muted mb-2">Aucun budget mensuel défini.</p>
              <button onClick={handleOpenAdd} className="text-xs text-accent font-bold hover:underline">Créer un budget mensuel</button>
            </div>
          ) : (
            monthlyBudgets.map(budget => (
              <BudgetCard 
                key={budget._id} 
                budget={budget} 
                onEdit={handleOpenEdit}
                onDelete={deleteBudget}
                selectedMonth={monthStr}
              />
            ))
          )}
        </div>

        {/* Yearly Budgets Section */}
        <div className="mb-6">
          {renderSectionHeader("Budgets annuels", prevYear, nextYear)}
          {showSkeleton ? (
            <div className="space-y-4">
              <div className="h-[120px] bg-surface-2 rounded-2xl animate-pulse" />
            </div>
          ) : yearlyBudgets.length === 0 ? (
            <div className="text-center py-6 bg-surface-2/40 rounded-2xl border border-dashed border-border/60 mb-5">
              <p className="text-xs text-muted mb-2">Aucun budget annuel défini.</p>
              <button onClick={handleOpenAdd} className="text-xs text-accent font-bold hover:underline">Créer un budget annuel</button>
            </div>
          ) : (
            yearlyBudgets.map(budget => (
              <BudgetCard 
                key={budget._id} 
                budget={budget} 
                onEdit={handleOpenEdit}
                onDelete={deleteBudget}
                selectedYear={yearStr}
              />
            ))
          )}
        </div>
      </section>

      {/* Floating Action Button for Budget */}
      <button 
        onClick={handleOpenAdd}
        className="fixed bottom-[88px] right-6 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all z-20"
      >
        <Plus size={28} />
      </button>

      <BudgetFormSheet 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingBudget}
        onSave={async (data) => {
          if (editingBudget) {
            await updateBudget(editingBudget._id, data);
          } else {
            await addBudget(data);
          }
        }}
        onDelete={deleteBudget}
      />
    </AppShell>
  );
};

export default Budgets;
