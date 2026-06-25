import { useState, useContext } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton, HeaderPortalContext } from '../components/layout/AppShell';
import BudgetCard from '../components/budgets/BudgetCard';
import BudgetFormSheet from '../components/budgets/BudgetFormSheet';
import { useBudgets } from '../hooks/useBudgets';
import { ChevronLeft, ChevronRight, Plus, CreditCard, Calendar, ChevronDown } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import BottomSheet from '../components/ui/BottomSheet';

const Budgets = () => {
  const { isScrolled } = useContext(HeaderPortalContext);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

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

  const generateRecentMonthsGrouped = () => {
    const groups = {};
    const current = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = d.getFullYear().toString();
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push({ date: d, label: capitalizedLabel });
    }
    return groups;
  };

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
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted/60 mb-0.5">
            Période active
          </span>
          {selectedPeriod === 'monthly' ? (
            <button
              onClick={() => setIsMonthPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-surface border border-border/20 text-xs font-extrabold text-primary hover:border-copper/30 hover:bg-border/5 active:scale-98 transition-all"
            >
              <Calendar size={14} className="text-copper" />
              <span>{new Date(monthDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</span>
              <ChevronDown size={12} className="text-secondary shrink-0" />
            </button>
          ) : (
            <span className="text-xs font-bold text-primary">
              {selectedPeriod === 'weekly' 
                ? `Semaine du ${new Date(weekDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                : new Date(yearDate).getFullYear()
              }
            </span>
          )}
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

      {/* Month Selection Bottom Sheet */}
      <BottomSheet
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
      >
        <div className="space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-sm font-bold text-primary">Choisir un mois</h2>
          </div>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar pb-6">
            <button
              onClick={() => {
                setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
                setIsMonthPickerOpen(false);
              }}
              className={`w-full p-3 rounded-2xl border text-center font-bold text-xs active:scale-95 transition-all ${
                monthDate.getMonth() === new Date().getMonth() && monthDate.getFullYear() === new Date().getFullYear()
                  ? 'bg-copper/10 border-copper text-primary'
                  : 'bg-surface border-border/40 text-secondary'
              }`}
            >
              Mois en cours (Ce mois)
            </button>

            {Object.entries(generateRecentMonthsGrouped()).map(([year, monthsList]) => (
              <div key={year} className="space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block px-1">{year}</span>
                <div className="grid grid-cols-3 gap-2">
                  {monthsList.map((m) => {
                    const isSelected = monthDate.getMonth() === m.date.getMonth() && monthDate.getFullYear() === m.date.getFullYear();
                    return (
                      <button
                        key={m.label + year}
                        onClick={() => {
                          setMonthDate(new Date(m.date.getFullYear(), m.date.getMonth(), 1));
                          setIsMonthPickerOpen(false);
                        }}
                        className={`p-2.5 rounded-xl border text-center text-xs font-semibold active:scale-95 transition-all ${
                          isSelected
                            ? 'bg-copper/10 border-copper text-primary font-bold shadow-sm shadow-copper/5'
                            : 'bg-surface border-border/40 text-secondary'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default Budgets;
