import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/layout/AppShell';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TransactionFormSheet from '../components/transactions/TransactionFormSheet';
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarRange } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/transactions/calendar?month=${monthStr}`);
      setTransactions(res.data);
    } catch (e) {
      toast.error('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    fetchCalendarData();

    // Sync on transaction changes
    const handleRefresh = () => fetchCalendarData();
    window.addEventListener('transaction-changed', handleRefresh);
    return () => {
      window.removeEventListener('transaction-changed', handleRefresh);
    };
  }, [fetchCalendarData]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const deleteTransaction = async (id) => {
    if (window.confirm('Supprimer cette transaction ?')) {
      try {
        await api.delete(`/transactions/${id}`);
        toast.success('Transaction supprimée');
        window.dispatchEvent(new CustomEvent('transaction-changed'));
      } catch (e) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // Get transactions for selected date
  const selectedDayTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getDate() === selectedDate.getDate() &&
           d.getMonth() === selectedDate.getMonth() &&
           d.getFullYear() === selectedDate.getFullYear();
  });

  const header = (
    <div className="w-full flex justify-between items-center">
      <button onClick={prevMonth} className="p-2 text-muted hover:text-primary transition-colors">
        <ChevronLeft size={24} />
      </button>
      <h1 className="text-lg font-bold text-primary capitalize">{formatMonth(currentDate)}</h1>
      <button onClick={nextMonth} className="p-2 text-muted hover:text-primary transition-colors">
        <ChevronRight size={24} />
      </button>
    </div>
  );

  return (
    <AppShell header={header}>
      
      {/* Calendar Grid */}
      <section className="mb-6 mt-2">
        {loading ? (
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

      {/* Selected Day Transactions Panel */}
      <section className="pb-24">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-secondary text-sm">
            Transactions du {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </h3>
        </div>

        <div className="space-y-3">
          {selectedDayTxs.length === 0 ? (
            <div className="text-center py-8 text-muted bg-surface-2/40 rounded-2xl border border-dashed border-border/40">
              Aucune transaction pour ce jour.
            </div>
          ) : (
            selectedDayTxs.map(tx => {
              const isPlanned = tx.isPlanned === true;
              return (
                <div 
                  key={tx._id} 
                  className={`p-4 rounded-2xl flex items-center gap-4 transition-colors group relative ${
                    isPlanned 
                      ? 'bg-purple-500/10 border border-purple-500/20' 
                      : 'bg-surface-2 border border-border/40'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: isPlanned ? '#a855f720' : `${tx.categoryId?.color || '#888'}20` }}
                  >
                    {isPlanned ? '🔁' : (tx.categoryId?.icon || '💸')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-primary font-bold text-sm truncate">
                        {isPlanned ? tx.description : (tx.categoryId?.name || 'Inconnu')}
                      </p>
                      {isPlanned && (
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-md">
                          Planifié
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate">
                      {isPlanned ? 'Répétition programmée' : (tx.note || tx.accountId?.name)}
                    </p>
                  </div>
                  
                  <div className="text-right flex items-center gap-2">
                    <span className={`font-mono font-bold ${
                      isPlanned 
                        ? 'text-purple-400' 
                        : tx.type === 'expense' ? 'text-primary' : 'text-accent'
                    }`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>

                    {!isPlanned && (
                      <button 
                        onClick={() => deleteTransaction(tx._id)}
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

      {/* Float Action Button */}
      <button 
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-[88px] right-6 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-20"
      >
        <Plus size={28} />
      </button>

      {/* Local form Sheet with selected date default */}
      <TransactionFormSheet 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        defaultDate={selectedDate}
        onSuccess={fetchCalendarData}
      />

    </AppShell>
  );
};

export default CalendarPage;
