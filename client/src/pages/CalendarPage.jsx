import React, { useState } from 'react';
import { HeaderTitle, HeaderActions } from '../components/layout/AppShell';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TransactionFormSheet from '../components/transactions/TransactionFormSheet';
import { ChevronLeft, ChevronRight, Trash2, Plus, Calendar, ChevronDown } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AiBadge from '../components/ui/AiBadge';
import BottomSheet from '../components/ui/BottomSheet';

const CalendarPage = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const isCurrentMonth = () => {
    const today = new Date();
    return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

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

  const actions = (
    <button 
      onClick={() => setIsFormOpen(true)}
      className="p-1.5 bg-copper-dim hover:bg-copper/20 rounded-full text-copper transition-colors active:scale-95"
      title="Ajouter une transaction"
    >
      <Plus size={16} />
    </button>
  );

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'calendar', monthStr],
    queryFn: async () => {
      const res = await api.get(`/transactions/calendar?month=${monthStr}`);
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      toast.success('Transaction supprimée');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    if (isCurrentMonth()) return;
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Get transactions for selected date
  const selectedDayTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getDate() === selectedDate.getDate() &&
           d.getMonth() === selectedDate.getMonth() &&
           d.getFullYear() === selectedDate.getFullYear();
  });

  return (
    <>
      <HeaderTitle>Calendrier</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      
      {/* Large Page Title */}
      <div className="mb-5 mt-2 px-1">
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Calendrier</h1>
        <p className="text-xs text-secondary mt-0.5 font-medium">Planifie et suis tes opérations au jour le jour pour garder l'esprit tranquille.</p>
      </div>

      {/* Month Navigation Bar */}
      <div className="flex items-center justify-between bg-surface-2-glass backdrop-blur-md p-1.5 rounded-2xl border border-border/40 shadow-sm mb-4 select-none">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 rounded-xl bg-surface hover:bg-border/25 active:scale-95 transition-all text-secondary hover:text-primary"
          title="Mois précédent"
        >
          <ChevronLeft size={16} />
        </button>
        
        <button
          type="button"
          onClick={() => setIsMonthPickerOpen(true)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-surface border border-border/20 text-xs font-extrabold text-primary hover:border-copper/30 hover:bg-border/5 active:scale-98 transition-all"
        >
          <Calendar size={14} className="text-copper" />
          <span className="capitalize">{formatMonth(currentDate)}</span>
          <ChevronDown size={12} className="text-secondary shrink-0" />
        </button>

        <button
          type="button"
          onClick={nextMonth}
          disabled={isCurrentMonth()}
          className={`p-2 rounded-xl bg-surface border border-border/20 text-primary active:scale-95 transition-all ${
            isCurrentMonth() ? 'opacity-40 cursor-not-allowed' : 'hover:bg-border/20'
          }`}
          title="Mois suivant"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      
      {/* Calendar Grid */}
      <section className="mb-6">
        {isLoading ? (
          <div className="h-64 bg-surface-2 rounded-3xl animate-pulse" />
        ) : (
          <MiniCalendar 
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            transactions={transactions}
          />
        )}
      </section>

      {/* Coach IA recommendation */}
      <section className="mb-6">
        <div className="bg-surface-2 p-4 rounded-[24px] border border-border/40 flex gap-3 items-start select-none shadow-sm">
          <AiBadge text="Coach IA" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-secondary font-semibold leading-relaxed">
              {transactions.filter(t => new Date(t.date).getTime() > new Date().getTime()).length === 0
                ? "Tu n'as aucune charge planifiée pour le reste du mois. C'est le moment idéal pour épargner un peu ! 🎯"
                : "Planifie et anticipe tes prochaines échéances à l'avance pour garder l'esprit tranquille. Tu es bien parti ! 👍"}
            </p>
          </div>
        </div>
      </section>

      {/* Selected Day Transactions Panel */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-secondary text-sm">
            Transactions du {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </h3>
          <button
            onClick={() => setIsFormOpen(true)}
            className="text-xs font-bold text-copper bg-copper-dim border border-copper/15 hover:bg-copper hover:text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1"
          >
            <Plus size={12} />
            <span>Ajouter</span>
          </button>
        </div>

        <div className="space-y-3">
          {selectedDayTxs.length === 0 ? (
            <div className="w-full text-center py-8 text-muted bg-surface-2/20 rounded-[24px] border border-dashed border-border/60 flex flex-col items-center justify-center gap-1.5 select-none">
              <span className="text-lg opacity-60">📅</span>
              <p className="text-xs font-bold">Aucune transaction pour ce jour.</p>
            </div>
          ) : (
            selectedDayTxs.map(tx => {
              const isPlanned = tx.isPlanned === true;
              return (
                <div 
                  key={tx._id} 
                  className={`p-3.5 rounded-[24px] flex items-center gap-3 sm:gap-4 transition-colors group relative ${
                    isPlanned 
                      ? 'bg-purple-500/5 border border-purple-500/15' 
                      : 'bg-surface-2 border border-border/40 hover:bg-surface/30'
                  }`}
                >
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ 
                      backgroundColor: isPlanned 
                        ? 'rgba(139, 92, 246, 0.12)' 
                        : tx.type === 'transfer'
                          ? 'rgba(59, 130, 246, 0.12)'
                          : `${tx.categoryId?.color || '#888'}12`,
                      border: isPlanned
                        ? '1px solid rgba(139, 92, 246, 0.20)'
                        : tx.type === 'transfer'
                          ? '1px solid rgba(59, 130, 246, 0.20)'
                          : `1px solid ${tx.categoryId?.color || '#888'}25`
                    }}
                  >
                    {isPlanned ? '🔁' : tx.type === 'transfer' ? '🔄' : (tx.categoryId?.icon || '💸')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-primary font-bold text-xs sm:text-sm truncate leading-snug">
                        {isPlanned 
                          ? tx.description 
                          : tx.type === 'transfer' 
                            ? (tx.description || tx.note || 'Virement') 
                            : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie ⚠️')
                        }
                      </p>
                      {isPlanned && (
                        <span className="text-[9px] font-bold text-purple bg-purple/10 border border-purple/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                          Planifié
                        </span>
                      )}
                    </div>

                    {tx.type === 'transfer' ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-secondary">
                        <span className="inline-flex items-center gap-1 font-bold text-secondary truncate max-w-[110px] xs:max-w-[160px]">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                          <span className="truncate">{tx.accountId?.name || 'Inconnu'}</span>
                        </span>
                        <span className="text-muted text-[10px] shrink-0">➔</span>
                        <span className="inline-flex items-center gap-1 font-bold text-secondary truncate max-w-[110px] xs:max-w-[160px]">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.toAccountId?.color || '#888' }} />
                          <span className="truncate">{tx.toAccountId?.name || 'Inconnu'}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {isPlanned ? (
                          <span className="text-[10px] text-purple/80 font-bold truncate">
                            Répétition programmée
                          </span>
                        ) : tx.categoryId?.name ? (
                          <span className="text-[10px] text-secondary/80 font-bold truncate">
                            {tx.categoryId.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-0.5">
                            À catégoriser
                          </span>
                        )}
                        <span className="text-muted text-[8px]">•</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary truncate w-fit max-w-full">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                          <span className="truncate">{tx.accountId?.name || 'Inconnu'}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right flex items-center gap-2 shrink-0 ml-auto pl-1">
                    <span className={`font-premium-numbers font-bold text-xs sm:text-sm ${
                      isPlanned 
                        ? 'text-purple' 
                        : (tx.type === 'expense' || tx.type === 'transfer') ? 'text-danger' : 'text-accent'
                    }`}>
                      {isPlanned ? '' : (tx.type === 'expense' || tx.type === 'transfer' ? '-' : '+')}
                      {formatCurrency(tx.amount)}
                    </span>

                    {!isPlanned && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTxToDelete(tx);
                          setConfirmDeleteOpen(true);
                        }}
                        className="hidden group-hover:flex ml-2 text-danger hover:bg-danger/10 p-2 rounded-xl transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Local form Sheet with selected date default */}
      <TransactionFormSheet 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        defaultDate={selectedDate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setTxToDelete(null);
        }}
        onConfirm={async () => {
          if (txToDelete) {
            await deleteMutation.mutateAsync(txToDelete._id);
          }
          setConfirmDeleteOpen(false);
          setTxToDelete(null);
        }}
        title="Supprimer la transaction ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      >
        {txToDelete && (
          <p className="text-xs text-secondary leading-relaxed">
            Êtes-vous sûr de vouloir supprimer la transaction <span className="text-primary font-semibold">"{txToDelete.description || txToDelete.note || txToDelete.categoryId?.name || (txToDelete.type === 'transfer' ? 'Virement' : 'Transaction')}"</span> d'un montant de <span className="text-danger font-mono font-semibold">{formatCurrency(txToDelete.amount)}</span> ?
            <br />
            <br />
            Cette action est irréversible et réajustera le solde de votre compte.
          </p>
        )}
      </ConfirmModal>

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
                setCurrentDate(new Date());
                setIsMonthPickerOpen(false);
              }}
              className={`w-full p-3 rounded-2xl border text-center font-bold text-xs active:scale-95 transition-all ${
                currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
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
                    const isSelected = currentDate.getMonth() === m.date.getMonth() && currentDate.getFullYear() === m.date.getFullYear();
                    return (
                      <button
                        key={m.label + year}
                        onClick={() => {
                          setCurrentDate(m.date);
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

export default CalendarPage;
