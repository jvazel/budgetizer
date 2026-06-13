import React, { useState } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import { useScheduled } from '../hooks/useScheduled';
import ScheduledFormSheet from '../components/scheduled/ScheduledFormSheet';
import { Plus, CreditCard, HelpCircle, Edit, Trash2 } from 'lucide-react';

const SubscriptionsPage = () => {
  const { 
    scheduled, 
    loading, 
    addScheduled, 
    updateScheduled, 
    deleteScheduled 
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
    if (window.confirm('Résilier cet abonnement planifié ?')) {
      await deleteScheduled(id);
    }
  };

  // Filter subscriptions from scheduled transactions
  const activeSubscriptions = scheduled.filter(st => st.isSubscription && st.isActive);

  // Compute total monthly & annual costs
  let totalMonthlyCost = 0;
  activeSubscriptions.forEach(sub => {
    const { every, unit } = sub.frequency;
    let factor = 0;
    
    // Normalize frequency to monthly factor
    if (unit === 'day') factor = 30 / every;
    else if (unit === 'week') factor = 4.33 / every;
    else if (unit === 'month') factor = 1 / every;
    else if (unit === 'year') factor = 1 / (every * 12);

    totalMonthlyCost += sub.amount * factor;
  });

  const totalAnnualCost = totalMonthlyCost * 12;

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
      <HeaderTitle>Abonnements</HeaderTitle>
      <HeaderBackButton to="/scheduled" />
      <HeaderActions>{actions}</HeaderActions>
      
      {/* 1. Summary Card */}
      <section className="mb-8 mt-2">
        <div className="bg-gradient-to-br from-accent to-emerald-600 p-6 rounded-[24px] text-white shadow-xl relative overflow-hidden">
          {/* Subtle light bubble background */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
          
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs uppercase tracking-wider font-extrabold text-white/80 flex items-center gap-1.5">
              <CreditCard size={14} /> Total abonnements
            </span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
              {activeSubscriptions.length} actifs
            </span>
          </div>

          <h2 className="font-mono text-3xl font-extrabold mb-1">
            {formatCurrency(totalMonthlyCost)} <span className="text-sm font-medium text-white/85">/ mois</span>
          </h2>
          <p className="text-xs text-white/80 font-medium">
            Soit {formatCurrency(totalAnnualCost)} par an
          </p>
        </div>
      </section>

      {/* 2. Subscriptions List */}
      <section className="space-y-4 mb-6">
        <h3 className="text-sm font-extrabold text-secondary px-1">Liste des abonnements</h3>

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-20 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : activeSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-surface-2/40 rounded-[24px] border border-border/20 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-surface border border-border/40 flex items-center justify-center text-accent mb-4 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 rounded-full blur-md" />
              <CreditCard className="text-accent relative z-10" size={24} />
            </div>
            <p className="text-primary text-xs font-bold mb-1">Aucun abonnement</p>
            <p className="text-muted text-[10px] max-w-[200px] mb-3">Ajoutez un abonnement pour suivre vos coûts récurrents.</p>
            <button 
              onClick={handleOpenAdd}
              className="py-2.5 px-4 bg-accent text-white font-bold text-xs rounded-xl shadow-md shadow-accent/20 active:scale-95 transition-all"
            >
              Ajouter un abonnement
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSubscriptions.map(sub => (
              <div key={sub._id} className="bg-surface-2 p-4 rounded-2xl border border-border/40 flex items-center justify-between group relative">
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 shadow-sm"
                    style={{ backgroundColor: `${sub.categoryId?.color || '#888'}20` }}
                  >
                    {sub.categoryId?.icon || '💳'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-primary truncate">{sub.description}</h4>
                    <p className="text-xs text-muted truncate">
                      Prochain : {new Date(sub.nextDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <span className="font-mono font-bold text-primary">
                    -{formatCurrency(sub.amount)}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <button 
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1 text-muted hover:text-accent transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sub._id)}
                      className="p-1 text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ScheduledFormSheet 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingSchedule}
        defaultIsSubscription={true}
      />

    </>
  );
};

export default SubscriptionsPage;
