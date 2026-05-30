import React, { useState, useEffect, useContext } from 'react';
import AppShell from '../components/layout/AppShell';
import NumericKeypad from '../components/ui/NumericKeypad';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeftRight, ArrowRight, AlertCircle, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

const TransfersPage = () => {
  const { user } = useContext(AuthContext);
  const { accounts, loading: accountsLoading, fetchAccounts } = useAccounts();
  const { transactions: transfers, loading: transfersLoading, addTransaction, deleteTransaction } = useTransactions({ type: 'transfer' });

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Virement instantané');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Set default accounts when loaded
  useEffect(() => {
    if (accounts.length >= 2) {
      if (!fromAccountId) setFromAccountId(accounts[0]._id);
      if (!toAccountId) setToAccountId(accounts[1]._id);
    } else if (accounts.length === 1) {
      if (!fromAccountId) setFromAccountId(accounts[0]._id);
    }
  }, [accounts, fromAccountId, toAccountId]);

  const formatCurrency = (value, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(value);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const handleTransfer = () => {
    if (!fromAccountId || !toAccountId) {
      toast.error('Veuillez sélectionner les deux comptes.');
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error('Le compte de départ et de destination doivent être différents.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    // Check balance
    const sourceAccount = accounts.find(acc => acc._id === fromAccountId);
    if (sourceAccount && sourceAccount.balance < numericAmount) {
      toast.error(`Solde insuffisant sur le compte de départ (${formatCurrency(sourceAccount.balance, sourceAccount.currency)}).`);
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    const numericAmount = parseFloat(amount);
    try {
      setIsSubmitting(true);
      setIsConfirmModalOpen(false);
      await addTransaction({
        type: 'transfer',
        accountId: fromAccountId,
        toAccountId,
        amount: numericAmount,
        description: description || 'Virement instantané',
        date: new Date(),
        note: note
      });

      toast.success('Virement effectué avec succès !');
      setAmount('');
      setNote('');
      setDescription('Virement instantané');
      
      // Update account balances immediately
      await fetchAccounts();
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'exécution du virement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransfer = (transferId) => {
    setSelectedTransferId(transferId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTransferId) return;
    try {
      await deleteTransaction(selectedTransferId);
      toast.success('Virement annulé et soldes restaurés.');
      await fetchAccounts();
    } catch (err) {
      toast.error("Erreur lors de l'annulation du virement.");
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedTransferId(null);
    }
  };

  const activeFromAccount = accounts.find(acc => acc._id === fromAccountId);
  const activeToAccount = accounts.find(acc => acc._id === toAccountId);

  return (
    <AppShell title="Virements Instantanés" backTo="/">
      <div className="space-y-6 pb-24 px-1">
        
        {/* Main interactive transfer card */}
        <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4">
            Nouveau Virement
          </h3>

          {accounts.length < 2 && !accountsLoading ? (
            <div className="p-4 bg-danger/10 border border-danger/25 rounded-2xl flex items-center gap-3 text-danger text-xs font-semibold">
              <AlertCircle size={18} />
              <span>Vous devez avoir au moins 2 comptes bancaires pour effectuer un virement.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Source and Destination selection cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative">
                {/* Source Account Box */}
                <div className="flex flex-col bg-surface p-4 rounded-2xl border border-border/30 relative">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Débiter (Source)</span>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="bg-transparent text-sm font-bold text-primary focus:outline-none w-full"
                  >
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id} className="bg-surface-2">
                        {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                      </option>
                    ))}
                  </select>
                  {activeFromAccount && (
                    <div className="text-[10px] text-muted font-medium mt-2">
                      Disponible : <span className="font-mono font-bold text-accent">{formatCurrency(activeFromAccount.balance, activeFromAccount.currency)}</span>
                    </div>
                  )}
                </div>

                {/* Arrow Connector */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface-2 border border-border/40 flex items-center justify-center text-accent shadow-sm hidden md:flex">
                  <ArrowRight size={16} />
                </div>
                
                {/* Destination Account Box */}
                <div className="flex flex-col bg-surface p-4 rounded-2xl border border-border/30 relative">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Créditer (Destination)</span>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="bg-transparent text-sm font-bold text-primary focus:outline-none w-full"
                  >
                    {accounts.filter(acc => acc._id !== fromAccountId).map(acc => (
                      <option key={acc._id} value={acc._id} className="bg-surface-2">
                        {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                      </option>
                    ))}
                  </select>
                  {activeToAccount && (
                    <div className="text-[10px] text-muted font-medium mt-2">
                      Disponible : <span className="font-mono font-bold text-accent">{formatCurrency(activeToAccount.balance, activeToAccount.currency)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount display */}
              <div className="py-4 text-center">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Montant à transférer</span>
                <div className="font-mono text-4xl font-extrabold tracking-tight text-accent flex items-center justify-center gap-1">
                  <span>{amount || '0'}</span>
                  <span className="text-2xl text-muted font-medium">€</span>
                </div>
              </div>

              {/* Keypad */}
              <div className="p-3 bg-surface rounded-2xl border border-border/20">
                <NumericKeypad
                  value={amount}
                  onChange={setAmount}
                  onSubmit={handleTransfer}
                  showSubmit={false}
                />
              </div>

              {/* Description and Note */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    placeholder="Ex: Virement mensuel..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-surface border border-border/40 px-4 py-2.5 rounded-xl text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Note (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Notes supplémentaires..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-surface border border-border/40 px-4 py-2.5 rounded-xl text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Confirm CTA */}
              <button
                type="button"
                onClick={handleTransfer}
                disabled={isSubmitting}
                className="w-full bg-accent text-white py-3.5 rounded-2xl font-bold hover:scale-[1.01] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 mt-4 text-xs tracking-wide uppercase disabled:opacity-55 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirmer le virement</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Recent Transfers List */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1">
            Virements Récents
          </h3>

          {transfersLoading && transfers.length === 0 ? (
            <div className="space-y-2">
              <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
              <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 bg-surface-2/30 rounded-[28px] border border-dashed border-border/40">
              <p className="text-muted text-xs">Aucun virement récent trouvé.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transfers.map(tx => (
                <div
                  key={tx._id}
                  className="bg-surface-2 border border-border/40 p-4 rounded-[22px] flex items-center justify-between transition-all shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                      <ArrowLeftRight size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary truncate leading-tight">
                        {tx.description || 'Virement instantané'}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold mt-1 uppercase tracking-wider">
                        <span>{tx.accountId?.name || 'Compte source'}</span>
                        <ArrowRight size={10} className="text-muted" />
                        <span>{tx.toAccountId?.name || 'Compte cible'}</span>
                      </div>
                      {tx.note && (
                        <p className="text-[10px] text-muted italic mt-0.5 truncate">{tx.note}</p>
                      )}
                      <p className="text-[9px] text-muted/80 flex items-center gap-1 mt-1 font-semibold">
                        <Calendar size={11} />
                        <span>{formatDate(tx.date)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="font-mono font-bold text-sm text-primary">
                      {formatCurrency(tx.amount, tx.accountId?.currency)}
                    </span>
                    <button
                      onClick={() => handleDeleteTransfer(tx._id)}
                      className="p-2 hover:bg-danger/10 text-muted hover:text-danger rounded-xl transition-colors"
                      title="Annuler le virement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTransferId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Annuler le virement"
        confirmText="Annuler"
        cancelText="Conserver"
        type="danger"
      >
        <p className="text-xs text-secondary leading-relaxed">
          Voulez-vous vraiment annuler ce virement ? Les soldes des comptes concernés seront restaurés à leur état précédent.
        </p>
      </ConfirmModal>

      {activeFromAccount && activeToAccount && (
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleExecuteTransfer}
          title="Confirmer le virement"
          confirmText="Valider le virement"
          cancelText="Retour"
          type="info"
        >
          <div className="space-y-4">
            <p className="text-xs text-secondary leading-relaxed">
              Vous êtes sur le point de transférer <span className="font-mono font-bold text-accent">{formatCurrency(parseFloat(amount || '0'), activeFromAccount.currency)}</span> de <strong>{activeFromAccount.name}</strong> vers <strong>{activeToAccount.name}</strong>.
            </p>
            
            <div className="space-y-2.5 bg-surface p-4 rounded-2xl border border-border/30">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Aperçu des nouveaux soldes :
              </span>
              
              {/* Source Account Balance Preview */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-secondary font-semibold truncate max-w-[120px]">{activeFromAccount.name}</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-secondary">{formatCurrency(activeFromAccount.balance, activeFromAccount.currency)}</span>
                  <ArrowRight size={10} className="text-muted" />
                  <span className="text-danger font-bold">
                    {formatCurrency(activeFromAccount.balance - parseFloat(amount || '0'), activeFromAccount.currency)}
                  </span>
                </div>
              </div>
              
              {/* Destination Account Balance Preview */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-secondary font-semibold truncate max-w-[120px]">{activeToAccount.name}</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-secondary">{formatCurrency(activeToAccount.balance, activeToAccount.currency)}</span>
                  <ArrowRight size={10} className="text-muted" />
                  <span className="text-accent font-bold">
                    {formatCurrency(activeToAccount.balance + parseFloat(amount || '0'), activeToAccount.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ConfirmModal>
      )}
    </AppShell>
  );
};

export default TransfersPage;
