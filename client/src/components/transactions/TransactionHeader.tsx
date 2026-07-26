import React from 'react';
import { HeaderTitle, HeaderActions } from '../layout/AppShell';
import { Search, Filter, ChevronLeft, ChevronRight, ChevronDown, Calendar, X } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';

export interface StatsSummary {
  income: number;
  expenses: number;
  net: number;
  count: number;
}

interface TransactionHeaderProps {
  isScrolled: boolean;
  showSearch: boolean;
  setShowSearch: (val: boolean | ((prev: boolean) => boolean)) => void;
  showFilters: boolean;
  setShowFilters: (val: boolean | ((prev: boolean) => boolean)) => void;
  search: string;
  setSearch: (val: string) => void;
  period: string;
  setPeriod: (val: string) => void;
  isMonthSheetOpen: boolean;
  setIsMonthSheetOpen: (val: boolean) => void;
  stats: StatsSummary;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  isCurrentMonth: () => boolean;
  formatPeriodLabel: (p: string) => string;
  generateRecentMonthsGrouped: () => Record<string, Array<{ key: string; label: string }>>;
}

export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
  isScrolled,
  showSearch,
  setShowSearch,
  showFilters,
  setShowFilters,
  search,
  setSearch,
  period,
  setPeriod,
  isMonthSheetOpen,
  setIsMonthSheetOpen,
  stats,
  handlePrevMonth,
  handleNextMonth,
  isCurrentMonth,
  formatPeriodLabel,
  generateRecentMonthsGrouped
}) => {
  const actions = (
    <>
      <button 
        onClick={() => {
          setShowSearch(!showSearch);
          if (showFilters) setShowFilters(false);
        }} 
        className={`hover:text-primary transition-colors p-1 rounded-lg ${showSearch ? 'text-accent' : ''}`}
      >
        <Search size={20} />
      </button>
      <button 
        onClick={() => {
          setShowFilters(!showFilters);
          if (showSearch) setShowSearch(false);
        }} 
        className={`hover:text-primary transition-colors p-1 rounded-lg ${showFilters ? 'text-accent' : ''}`}
      >
        <Filter size={20} />
      </button>
    </>
  );

  return (
    <>
      <HeaderTitle collapsible={true}>Transactions</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>

      {/* Large Collapsible Header Title on Page */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Transactions</h1>
        <p className="text-xs text-secondary mt-0.5 font-medium">Historique détaillé de tes flux et opérations.</p>
      </div>

      <div className="mt-4 space-y-4">
        {/* Month Navigation Bar */}
        <div className="flex items-center justify-between bg-surface bg-surface-2-glass backdrop-blur-md p-1.5 rounded-2xl border border-border/40 shadow-sm select-none" style={{ transform: 'translate3d(0, 0, 0)' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={period === 'all'}
            className={`p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary hover:text-primary ${
              period === 'all' ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button
            type="button"
            onClick={() => setIsMonthSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-surface border border-border/20 text-xs font-extrabold text-primary hover:border-copper/30 hover:bg-border/5 active:scale-98 transition-all"
          >
            <Calendar size={14} className="text-copper" />
            <span>{formatPeriodLabel(period)}</span>
            <ChevronDown size={12} className="text-secondary shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={period === 'all' || isCurrentMonth()}
            className={`p-2 rounded-xl bg-surface border border-border/20 text-primary active:scale-95 transition-all ${
              (period === 'all' || isCurrentMonth()) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-border/20'
            }`}
            title="Mois suivant"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 bg-surface-2-glass backdrop-blur-md border border-border/40 rounded-2xl p-3 text-center select-none shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Revenus</span>
            <span className="text-xs font-extrabold text-accent font-premium-numbers block mt-0.5">
              +{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.income)}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Dépenses</span>
            <span className="text-xs font-extrabold text-danger font-premium-numbers block mt-0.5">
              -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.expenses)}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider block">Net ({stats.count})</span>
            <span className={`text-xs font-extrabold font-premium-numbers block mt-0.5 ${stats.net >= 0 ? 'text-accent' : 'text-danger'}`}>
              {stats.net >= 0 ? '+' : ''}{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.net)}
            </span>
          </div>
        </div>
        
        {/* Dynamic sliding Search Bar */}
        {showSearch && (
          <div className="bg-surface-2 p-4 rounded-2xl border border-border/40 shadow-sm flex items-center gap-3">
            <Search size={18} className="text-muted flex-shrink-0" />
            <input 
              type="text"
              placeholder="Rechercher (libellé, note, compte, catégorie...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-primary focus:outline-none placeholder-muted"
              autoFocus
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="p-1 rounded-full hover:bg-border/20 text-muted transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Month Selection Bottom Sheet */}
      <BottomSheet
        isOpen={isMonthSheetOpen}
        onClose={() => setIsMonthSheetOpen(false)}
      >
        <div className="space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-sm font-bold text-primary">Choisir la période</h2>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar pb-6">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPeriod('month');
                  setIsMonthSheetOpen(false);
                }}
                className={`p-3 rounded-2xl border text-center font-bold text-xs active:scale-95 transition-all ${
                  period === 'month'
                    ? 'bg-copper/10 border-copper text-primary font-bold shadow-sm shadow-copper/5'
                    : 'bg-surface border-border/40 text-secondary'
                }`}
              >
                Mois en cours (Ce mois)
              </button>

              <button
                type="button"
                onClick={() => {
                  setPeriod('all');
                  setIsMonthSheetOpen(false);
                }}
                className={`p-3 rounded-2xl border text-center font-bold text-xs active:scale-95 transition-all ${
                  period === 'all'
                    ? 'bg-copper/10 border-copper text-primary font-bold shadow-sm shadow-copper/5'
                    : 'bg-surface border-border/40 text-secondary'
                }`}
              >
                Toutes les dates
              </button>
            </div>

            {Object.entries(generateRecentMonthsGrouped()).map(([year, months]) => {
              const currentD = new Date();
              const currentKey = `${currentD.getFullYear()}-${String(currentD.getMonth() + 1).padStart(2, '0')}`;
              
              return (
                <div key={year} className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest block px-1">{year}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((m) => {
                      const isActive = period === m.key || (m.key === currentKey && period === 'month');
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            if (m.key === currentKey) {
                              setPeriod('month');
                            } else {
                              setPeriod(m.key);
                            }
                            setIsMonthSheetOpen(false);
                          }}
                          className={`p-2.5 rounded-xl border text-center text-xs font-semibold active:scale-95 transition-all ${
                            isActive
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
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default TransactionHeader;
