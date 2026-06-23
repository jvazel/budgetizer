import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { HeaderTitle, HeaderActions, HeaderBackButton, HeaderPortalContext } from '../components/layout/AppShell';
import { useScheduled } from '../hooks/useScheduled';
import ScheduledFormSheet from '../components/scheduled/ScheduledFormSheet';
import ConfirmModal from '../components/ui/ConfirmModal';
import BottomSheet from '../components/ui/BottomSheet';
import { Plus, Clock, Check, RefreshCw, Trash2, Edit, CreditCard } from 'lucide-react';

const ScheduledPage = () => {
  const { isScrolled } = useContext(HeaderPortalContext);
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

  const [activeTab, setActiveTab] = useState('scheduled'); // 'scheduled' | 'subscriptions'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [skipItemId, setSkipItemId] = useState(null);
  const [customConfirmTxId, setCustomConfirmTxId] = useState(null);
  const [customConfirmAmount, setCustomConfirmAmount] = useState('');

  const handleDeleteConfirm = async () => {
    if (deleteItemId) {
      await deleteScheduled(deleteItemId);
      setDeleteItemId(null);
    }
  };

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

  const handleDelete = (id) => {
    setDeleteItemId(id);
  };

  const handleConfirm = async (id) => {
    await confirmPending(id);
  };

  const handleSkipConfirm = async () => {
    if (skipItemId) {
      await skipPending(skipItemId);
      setSkipItemId(null);
    }
  };

  const handleSkip = (id) => {
    setSkipItemId(id);
  };

  const handleConfirmCustomClick = (id, currentAmount) => {
    setCustomConfirmTxId(id);
    setCustomConfirmAmount(String(currentAmount));
  };

  const handleCustomConfirmSubmit = async (e) => {
    e.preventDefault();
    if (customConfirmTxId) {
      const parsed = parseFloat(customConfirmAmount);
      if (!isNaN(parsed) && parsed > 0) {
        await confirmPending(customConfirmTxId, parsed);
      } else {
        await confirmPending(customConfirmTxId);
      }
      setCustomConfirmTxId(null);
    }
  };

  const actions = (
    <button 
      onClick={handleOpenAdd}
      className="p-1.5 bg-copper-dim hover:bg-copper/20 rounded-full text-copper transition-colors"
    >
      <Plus size={16} />
    </button>
  );

  // Filter active subscriptions and planned transactions
  const activeSubscriptions = scheduled.filter(st => st.isSubscription && st.isActive);
  const activeScheduled = scheduled.filter(st => !st.isSubscription);

  // Compute total monthly & annual costs for subscriptions
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

  return (
    <>
      <HeaderTitle collapsible={true}>Planifications</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <HeaderBackButton to="/" />

      {/* Large Page Title */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <div className="text-2xl font-extrabold text-primary tracking-tight">
          Planifications & Abonnements
        </div>
        <p className="text-xs text-secondary mt-0.5 font-medium">Suivi de vos échéances et coûts de souscriptions récurrentes.</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-surface-2 p-1 rounded-2xl mx-auto w-full shadow-sm mb-6 mt-2">
        <button 
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'scheduled' ? 'bg-surface text-primary shadow-sm font-semibold' : 'text-secondary hover:text-primary'
          }`}
        >
          Échéances
        </button>
        <button 
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'subscriptions' ? 'bg-surface text-primary shadow-sm font-semibold' : 'text-secondary hover:text-primary'
          }`}
        >
          Abonnements
        </button>
      </div>

      {activeTab === 'scheduled' ? (
        <>
          {/* 1. Pending confirmations section */}
          {pending.length > 0 && (
            <section className="mb-8 space-y-4">
              <h3 className="text-sm font-extrabold text-secondary px-1 flex items-center gap-2">
                <Clock size={16} className="text-accent" /> À confirmer ({pending.length})
              </h3>
              
              <div className="space-y-3">
                {pending.map(tx => (
                  <div key={tx._id} className="bg-surface-2 p-5 rounded-[24px] border border-accent/20 shadow-md space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-lg text-accent shrink-0">
                          {tx.categoryId?.icon || '⏳'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-primary truncate">{tx.description || tx.categoryId?.name}</h4>
                          <p className="text-xs text-muted truncate">
                            Prévu le : {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-primary shrink-0 pl-1">{formatCurrency(tx.amount)}</span>
                    </div>

                    {/* Actions inside card */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleConfirm(tx._id)}
                        className="flex-1 bg-accent text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:scale-102 transition-transform animate-pulse"
                      >
                        <Check size={14} /> Confirmer
                      </button>
                      <button 
                        onClick={() => handleConfirmCustomClick(tx._id, tx.amount)}
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
          <section className="space-y-4 mb-6">
            <h3 className="text-sm font-extrabold text-secondary px-1">Planifications actives</h3>

            {loading ? (
              <div className="space-y-3">
                <div className="h-24 bg-surface-2 rounded-2xl animate-pulse" />
                <div className="h-24 bg-surface-2 rounded-2xl animate-pulse" />
              </div>
            ) : activeScheduled.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-surface-2/40 rounded-[24px] border border-border/20 shadow-inner">
                <div className="w-12 h-12 rounded-full bg-surface border border-border/40 flex items-center justify-center text-accent mb-4 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-accent/5 rounded-full blur-md" />
                  <Clock className="text-accent relative z-10" size={24} />
                </div>
                <p className="text-primary text-xs font-bold mb-1">Aucune planification</p>
                <p className="text-muted text-[10px] max-w-[200px] mb-3">Planifiez des factures récurrentes ou virements automatiques.</p>
                <button 
                  onClick={handleOpenAdd}
                  className="py-2.5 px-4 bg-copper text-white font-bold text-xs rounded-xl shadow-md shadow-copper/20 active:scale-95 transition-all"
                >
                  Ajouter une planification
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeScheduled.map(st => {
                  const frequencyText = `Tous les ${st.frequency.every} ${
                    st.frequency.unit === 'day' ? 'jours' : 
                    st.frequency.unit === 'week' ? 'semaines' : 
                    st.frequency.unit === 'month' ? 'mois' : 'ans'
                  }`;

                  return (
                    <div key={st._id} className="bg-surface-2 p-4 rounded-2xl border border-border/40 flex flex-col gap-3 group relative">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm shrink-0"
                            style={{ backgroundColor: `${st.categoryId?.color || '#888'}20` }}
                          >
                            {st.categoryId?.icon || '🔁'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-primary truncate" title={st.description}>{st.description}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {st.type === 'transfer' && (
                                <span className="text-[9px] font-bold text-info bg-info/10 px-1.5 py-0.5 rounded-full">
                                  🔄 Virement
                                </span>
                              )}
                              {st.type === 'transfer' && st.toAccountId?.type === 'credit' && (
                                <span className="text-[9px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded-full">
                                  🏦 Crédit
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0 pl-1">
                          <span className={`font-mono font-bold ${
                            st.type === 'expense' || (st.type === 'transfer' && st.toAccountId?.type === 'credit')
                              ? 'text-primary'
                              : 'text-accent'
                          }`}>
                            {st.type === 'expense' || (st.type === 'transfer' && st.toAccountId?.type === 'credit') ? '-' : '+'}{formatCurrency(st.amount)}
                          </span>
                          <p className="text-[9px] text-muted mt-1 whitespace-nowrap">
                            {frequencyText} · Prochain : {new Date(st.nextDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>

                      {/* Indicators & Actions */}
                      <div className="flex items-center justify-between border-t border-border/30 pt-2 text-[10px] text-muted">
                        <span className="flex items-center gap-1">
                          <RefreshCw size={10} className="text-accent" />
                          {st.autoConfirm ? 'Confirmation automatique' : 'Validation manuelle requise'}
                        </span>
                        
                        {st.type === 'transfer' && st.toAccountId?.type === 'credit' ? (
                          <span className="text-muted text-[10px]">
                            Géré depuis le{' '}
                            <Link 
                              to={`/accounts/${st.toAccountId._id || st.toAccountId}/credit`} 
                              className="text-accent hover:underline font-bold"
                            >
                              compte crédit
                            </Link>
                          </span>
                        ) : (
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Subscription Total Monthly / Yearly Cost Card */}
          <section className="mb-6">
            <div className="bg-premium-gradient p-6 rounded-[24px] text-primary relative overflow-hidden">
              <div className="glass-reflection opacity-20" />
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-copper/5 rounded-full blur-xl" />
              
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs uppercase tracking-wider font-extrabold text-secondary flex items-center gap-1.5">
                  <CreditCard size={14} /> Total abonnements
                </span>
                <span className="text-xs bg-copper-dim text-copper border border-copper/20 px-2.5 py-0.5 rounded-full font-bold">
                  {activeSubscriptions.length} actifs
                </span>
              </div>

              <h2 className="font-mono text-3xl font-black text-primary mb-1 font-premium-numbers">
                {formatCurrency(totalMonthlyCost)} <span className="text-sm font-medium text-secondary">/ mois</span>
              </h2>
              <p className="text-xs text-muted font-medium">
                Soit {formatCurrency(totalAnnualCost)} par an
              </p>
            </div>
          </section>

          {/* Subscriptions List */}
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
                  className="py-2.5 px-4 bg-copper text-white font-bold text-xs rounded-xl shadow-md shadow-copper/20 active:scale-95 transition-all"
                >
                  Ajouter un abonnement
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSubscriptions.map(sub => {
                  const frequencyText = `Tous les ${sub.frequency.every} ${
                    sub.frequency.unit === 'day' ? 'jours' : 
                    sub.frequency.unit === 'week' ? 'semaines' : 
                    sub.frequency.unit === 'month' ? 'mois' : 'ans'
                  }`;

                  return (
                    <div key={sub._id} className="bg-surface-2 p-4 rounded-2xl border border-border/40 flex items-center justify-between gap-3 group relative">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 shadow-sm"
                          style={{ backgroundColor: `${sub.categoryId?.color || '#888'}20` }}
                        >
                          {sub.categoryId?.icon || '💳'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-primary truncate">{sub.description}</h4>
                          <p className="text-xs text-muted truncate">
                            {frequencyText} · Prochain : {new Date(sub.nextDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right shrink-0 ml-auto pl-1">
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
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <ScheduledFormSheet 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingSchedule}
        defaultIsSubscription={activeTab === 'subscriptions'}
      />

      <ConfirmModal
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la planification"
        confirmText="Supprimer"
        type="danger"
      >
        <div className="text-xs text-secondary leading-relaxed space-y-2">
          <p>
            Êtes-vous sûr de vouloir supprimer cette transaction planifiée ?
          </p>
          <p className="font-semibold text-danger">
            ATTENTION : Cela supprimera définitivement cette planification ainsi que toutes ses occurrences futures. Cette action est irréversible.
          </p>
        </div>
      </ConfirmModal>

      <ConfirmModal
        isOpen={!!skipItemId}
        onClose={() => setSkipItemId(null)}
        onConfirm={handleSkipConfirm}
        title="Ignorer l'occurrence"
        confirmText="Ignorer"
        type="warning"
      >
        <div className="text-xs text-secondary leading-relaxed space-y-2">
          <p>
            Voulez-vous ignorer cette occurrence et passer directement à la suivante ?
          </p>
          <p className="font-semibold text-warning">
            Note : Elle ne sera pas ajoutée à l'historique des transactions.
          </p>
        </div>
      </ConfirmModal>

      <BottomSheet
        isOpen={!!customConfirmTxId}
        onClose={() => setCustomConfirmTxId(null)}
      >
        <form onSubmit={handleCustomConfirmSubmit} className="space-y-4">
          <div className="pb-2 border-b border-border/40">
            <h3 className="text-sm font-extrabold text-primary">Confirmer avec modification</h3>
            <p className="text-[11px] text-muted mt-0.5">Saisissez le montant réel débité pour cette transaction</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Montant (€)</label>
            <input
              type="number"
              step="0.01"
              value={customConfirmAmount}
              onChange={(e) => setCustomConfirmAmount(e.target.value)}
              className="w-full h-[52px] px-4 bg-surface border border-border rounded-2xl text-primary font-bold text-lg focus:outline-none focus:border-copper transition-colors"
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCustomConfirmTxId(null)}
              className="flex-1 py-3 bg-surface border border-border/40 text-secondary hover:text-primary rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-copper text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-copper/10"
            >
              Confirmer
            </button>
          </div>
        </form>
      </BottomSheet>
    </>
  );
};

export default ScheduledPage;
