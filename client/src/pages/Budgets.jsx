import { useState } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
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

  const actions = (
    <button 
      onClick={handleOpenAdd}
      className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-accent transition-colors"
      title="Créer un budget"
    >
      <Plus size={16} />
    </button>
  );

  return (
    <>
      <HeaderTitle>Budgets</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <HeaderBackButton to="/" />
      <section className="mb-6">
        {/* Weekly Budgets Section */}
        <div className="mb-6">
          {renderSectionHeader("Budgets hebdomadaires", prevWeek, nextWeek)}
          {showSkeleton ? (
            <div className="space-y-4">
              <div className="h-[120px] bg-surface-2 rounded-2xl animate-pulse" />
            </div>
          ) : weeklyBudgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-6 px-4 bg-surface-2/40 rounded-[16px] border border-border/20 shadow-inner mb-5">
              <p className="text-primary text-xs font-bold mb-1">Aucun budget hebdomadaire</p>
              <p className="text-muted text-[10px] mb-3">Suivez vos dépenses sur un cycle de 7 jours.</p>
              <button
                onClick={handleOpenAdd}
                className="py-2 px-3 bg-accent/10 hover:bg-accent/15 text-accent font-bold text-[10px] rounded-xl transition-all"
              >
                Créer un budget hebdomadaire
              </button>
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
            <div className="flex flex-col items-center justify-center text-center py-6 px-4 bg-surface-2/40 rounded-[16px] border border-border/20 shadow-inner mb-5">
              <p className="text-primary text-xs font-bold mb-1">Aucun budget mensuel</p>
              <p className="text-muted text-[10px] mb-3">Définissez une limite de dépenses pour le mois.</p>
              <button
                onClick={handleOpenAdd}
                className="py-2 px-3 bg-accent/10 hover:bg-accent/15 text-accent font-bold text-[10px] rounded-xl transition-all"
              >
                Créer un budget mensuel
              </button>
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
            <div className="flex flex-col items-center justify-center text-center py-6 px-4 bg-surface-2/40 rounded-[16px] border border-border/20 shadow-inner mb-5">
              <p className="text-primary text-xs font-bold mb-1">Aucun budget annuel</p>
              <p className="text-muted text-[10px] mb-3">Projetez vos limites financières sur l'année.</p>
              <button
                onClick={handleOpenAdd}
                className="py-2 px-3 bg-accent/10 hover:bg-accent/15 text-accent font-bold text-[10px] rounded-xl transition-all"
              >
                Créer un budget annuel
              </button>
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
    </>
  );
};

export default Budgets;
