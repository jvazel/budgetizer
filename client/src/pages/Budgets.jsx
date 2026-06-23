import { useState, useContext } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton, HeaderPortalContext } from '../components/layout/AppShell';
import BudgetCard from '../components/budgets/BudgetCard';
import BudgetFormSheet from '../components/budgets/BudgetFormSheet';
import { useBudgets } from '../hooks/useBudgets';
import { ChevronLeft, ChevronRight, Plus, CreditCard } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

const Budgets = () => {
  const { isScrolled } = useContext(HeaderPortalContext);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'

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
      <HeaderTitle collapsible={true}>Budgets</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <HeaderBackButton to="/" />

      {/* Large Collapsible Header Title on Page */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <div className="text-2xl font-extrabold text-primary tracking-tight">Budgets</div>
        <p className="text-[11px] text-secondary mt-0.5 font-medium">Définissez et suivez vos enveloppes budgétaires périodiques.</p>
      </div>

      {/* Segmented control for active period */}
      <div className="flex bg-surface p-1 rounded-2xl border border-border/40 gap-1 mb-5 select-none">
        {[
          { key: 'weekly', label: 'Semaine' },
          { key: 'monthly', label: 'Mois' },
          { key: 'yearly', label: 'Année' }
        ].map((period) => (
          <button
            key={period.key}
            type="button"
            onClick={() => setSelectedPeriod(period.key)}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all active-spring-sm ${
              selectedPeriod === period.key
                ? 'bg-copper text-white shadow-sm font-extrabold'
                : 'text-secondary hover:text-primary hover:bg-border/10'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Period Navigation Bar */}
      <div className="flex justify-between items-center bg-surface-2-glass backdrop-blur-md border border-border/40 rounded-2xl p-3 mb-6 select-none shadow-sm">
        <button 
          onClick={selectedPeriod === 'weekly' ? prevWeek : selectedPeriod === 'monthly' ? prevMonth : prevYear} 
          className="p-2 hover:bg-surface text-secondary hover:text-primary rounded-xl active:scale-95 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted/60">
            Période active
          </span>
          <span className="text-xs font-bold text-primary">
            {selectedPeriod === 'weekly' 
              ? `Semaine du ${new Date(weekDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
              : selectedPeriod === 'monthly'
                ? new Date(monthDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
                : new Date(yearDate).getFullYear()
            }
          </span>
        </div>

        <button 
          onClick={selectedPeriod === 'weekly' ? nextWeek : selectedPeriod === 'monthly' ? nextMonth : nextYear} 
          className="p-2 hover:bg-surface text-secondary hover:text-primary rounded-xl active:scale-95 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <section className="mb-6">
        {/* Weekly Budgets Section */}
        {selectedPeriod === 'weekly' && (
          <div className="mb-6">
            {showSkeleton ? (
              <div className="space-y-4">
                <div className="h-[120px] bg-surface-2 rounded-2xl animate-pulse" />
              </div>
            ) : weeklyBudgets.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Aucun budget hebdomadaire"
                description="Suivez vos dépenses sur un cycle de 7 jours en définissant une limite."
                actionLabel="Créer un budget hebdomadaire"
                onAction={handleOpenAdd}
              />
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
        )}

        {/* Monthly Budgets Section */}
        {selectedPeriod === 'monthly' && (
          <div className="mb-6">
            {showSkeleton ? (
              <div className="space-y-4">
                <div className="h-[120px] bg-surface-2 rounded-2xl animate-pulse" />
              </div>
            ) : monthlyBudgets.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Aucun budget mensuel"
                description="Définissez une limite de dépenses pour le mois en cours."
                actionLabel="Créer un budget mensuel"
                onAction={handleOpenAdd}
              />
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
        )}

        {/* Yearly Budgets Section */}
        {selectedPeriod === 'yearly' && (
          <div className="mb-6">
            {showSkeleton ? (
              <div className="space-y-4">
                <div className="h-[120px] bg-surface-2 rounded-2xl animate-pulse" />
              </div>
            ) : yearlyBudgets.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Aucun budget annuel"
                description="Projetez vos limites financières sur l'année complète."
                actionLabel="Créer un budget annuel"
                onAction={handleOpenAdd}
              />
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
        )}
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
