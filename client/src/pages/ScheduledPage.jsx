import React, { useState } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import { useScheduled } from '../hooks/useScheduled';
import ScheduledFormSheet from '../components/scheduled/ScheduledFormSheet';
import { Plus, Clock, HelpCircle, Check, AlertCircle, RefreshCw, Trash2, Edit } from 'lucide-react';

const ScheduledPage = () => {
  const { 
    scheduled, 
    pending, 
    loading, 
    addScheduled, 
    updateScheduled, 
    deleteScheduled, 
    confirmPending, 
    skipPending 
  } = useScheduled();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (schedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleSave = async (data) => {
    if (editingSchedule) {
      await updateScheduled(editingSchedule._id, data);
    } else {
      await addScheduled(data);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette transaction planifiée ainsi que toutes ses occurrences futures ?')) {
      await deleteScheduled(id);
    }
  };

  const handleConfirm = async (id) => {
    await confirmPending(id);
  };

  const handleConfirmCustom = async (id, currentAmount) => {
    const newAmountStr = window.prompt("Modifier le montant à confirmer (ou laisser vide pour conserver le montant prévu) :", currentAmount);
    if (newAmountStr === null) return; // User cancelled prompt
    const parsed = parseFloat(newAmountStr);
    if (!isNaN(parsed) && parsed > 0) {
      await confirmPending(id, parsed);
    } else {
      await confirmPending(id);
    }
  };

  const handleSkip = async (id) => {
    if (window.confirm("Ignorer cette occurrence et passer à la suivante ? Elle ne sera pas ajoutée à l'historique.")) {
      await skipPending(id);
    }
  };

  const actions = (
    <button 
      onClick={handleOpenAdd}
      className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-accent transition-colors"
    >
      <Plus size={16} />
    </button>
  );

  return (
    <>
      <HeaderTitle>Planifications</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <HeaderBackButton to="/" />
      
      {/* 1. Pending confirmations section */}
      {pending.length > 0 && (
        <section className="mb-8 mt-2 space-y-4">
          <h3 className="text-sm font-extrabold text-secondary px-1 flex items-center gap-2">
            <Clock size={16} className="text-accent" /> À confirmer ({pending.length})
          </h3>
          
          <div className="space-y-3">
            {pending.map(tx => (
              <div key={tx._id} className="bg-surface-2 p-5 rounded-[24px] border border-accent/20 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-lg text-accent">
                      {tx.categoryId?.icon || '⏳'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">{tx.description || tx.categoryId?.name}</h4>
                      <p className="text-xs text-muted">
                        Prévu le : {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-primary">{formatCurrency(tx.amount)}</span>
                </div>

                {/* Actions inside card */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleConfirm(tx._id)}
                    className="flex-1 bg-accent text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:scale-102 transition-transform"
                  >
                    <Check size={14} /> Confirmer
                  </button>
                  <button 
                    onClick={() => handleConfirmCustom(tx._id, tx.amount)}
                    className="px-3 bg-surface border border-border/40 text-primary py-2 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-border/20 transition-colors"
                  >
                    Modifier
                  </button>
                  <button 
                    onClick={() => handleSkip(tx._id)}
                    className="px-3 bg-danger/10 text-danger py-2 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-danger/20 transition-colors"
                  >
                    Passer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Active Scheduled items list */}
      <section className="space-y-4 pb-24">
        <h3 className="text-sm font-extrabold text-secondary px-1">Planifications actives</h3>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-24 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : scheduled.length === 0 ? (
          <div className="text-center py-12 text-muted bg-surface-2/40 rounded-3xl border border-dashed border-border/40 space-y-2">
            <HelpCircle size={32} className="mx-auto text-muted/60" />
            <p className="text-sm">Aucune transaction planifiée pour le moment.</p>
            <button 
              onClick={handleOpenAdd}
              className="text-xs text-accent font-bold underline"
            >
              Ajouter une planification
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduled.map(st => {
              const frequencyText = `Tous les ${st.frequency.every} ${
                st.frequency.unit === 'day' ? 'jours' : 
                st.frequency.unit === 'week' ? 'semaines' : 
                st.frequency.unit === 'month' ? 'mois' : 'ans'
              }`;

              return (
                <div key={st._id} className="bg-surface-2 p-4 rounded-2xl border border-border/40 flex flex-col gap-3 group relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
                        style={{ backgroundColor: `${st.categoryId?.color || '#888'}20` }}
                      >
                        {st.categoryId?.icon || '🔁'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-primary">{st.description}</h4>
                          {st.isSubscription && (
                            <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                              Abo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">
                          {frequencyText} · Prochain : {new Date(st.nextDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-2">
                      <span className={`font-mono font-bold ${st.type === 'expense' ? 'text-primary' : 'text-accent'}`}>
                        {st.type === 'expense' ? '-' : '+'}{formatCurrency(st.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Indicators & Actions */}
                  <div className="flex items-center justify-between border-t border-border/30 pt-2 text-[10px] text-muted">
                    <span className="flex items-center gap-1">
                      <RefreshCw size={10} className="text-accent" />
                      {st.autoConfirm ? 'Confirmation automatique' : 'Validation manuelle requise'}
                    </span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEdit(st)}
                        className="p-1 text-muted hover:text-accent transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(st._id)}
                        className="p-1 text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ScheduledFormSheet 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingSchedule}
      />

    </>
  );
};

export default ScheduledPage;
