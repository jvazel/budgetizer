import React, { useState, useEffect, useContext } from 'react';
import { HeaderTitle, HeaderBackButton, HeaderPortalContext } from '../components/layout/AppShell';
import AmountInput from '../components/ui/AmountInput';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeftRight, ArrowRight, AlertCircle, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const TransfersPage = () => {
  const { user } = useContext(AuthContext);
  const { isScrolled } = useContext(HeaderPortalContext);
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastTransferDetails, setLastTransferDetails] = useState(null);

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
      
      // Save details for success visual modal
      setLastTransferDetails({
        from: activeFromAccount?.name,
        to: activeToAccount?.name,
        amount: numericAmount,
        currency: activeFromAccount?.currency
      });
      setShowSuccessModal(true);

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
    <>
      <HeaderTitle collapsible={true}>Virements Instantanés</HeaderTitle>
      <HeaderBackButton to="/" />

      {/* Large Collapsible Header Title on Page */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Virements Instantanés</h1>
        <p className="text-xs text-secondary mt-0.5 font-medium">Déplacez vos fonds instantanément entre vos comptes.</p>
      </div>

      <div className="space-y-6 mb-6 px-1">
        
        {/* Main interactive transfer card */}
        <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm relative overflow-hidden">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start relative">
                
                {/* Source Account Selector */}
                <div className="flex flex-col w-full">
                  <Select
                    id="fromAccountId-select"
                    label="Débiter (Source)"
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    required
                  >
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                      </option>
                    ))}
                  </Select>
                  {activeFromAccount && (
                    <div className="text-[10px] text-muted font-bold mt-1.5 pl-1.5 uppercase tracking-wider">
                      Disponible : <span className="font-premium-numbers text-accent">{formatCurrency(activeFromAccount.balance, activeFromAccount.currency)}</span>
                    </div>
                  )}
                </div>

                {/* Desktop Arrow Connector */}
                <div className="absolute left-1/2 top-[34px] -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-surface-2 border border-border/40 flex items-center justify-center text-copper shadow-sm hidden md:flex">
                  <ArrowRight size={16} />
                </div>

                {/* Mobile Arrow Connector */}
                <div className="flex md:hidden justify-center my-1 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-surface border border-border/40 flex items-center justify-center text-copper shadow-sm">
                    <ArrowRight size={16} className="rotate-90" />
                  </div>
                </div>
                
                {/* Destination Account Selector */}
                <div className="flex flex-col w-full">
                  <Select
                    id="toAccountId-select"
                    label="Créditer (Destination)"
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    required
                  >
                    {accounts.filter(acc => acc._id !== fromAccountId).map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                      </option>
                    ))}
                  </Select>
                  {activeToAccount && (
                    <div className="text-[10px] text-muted font-bold mt-1.5 pl-1.5 uppercase tracking-wider">
                      Disponible : <span className="font-premium-numbers text-accent">{formatCurrency(activeToAccount.balance, activeToAccount.currency)}</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Amount Input */}
              <div className="p-5 bg-surface rounded-2xl border border-border/20 text-center">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Montant à transférer</span>
                <AmountInput 
                  value={amount}
                  onChange={setAmount}
                  type="transfer"
                  autoFocus={true}
                />
              </div>

              {/* Description and Note standard inputs */}
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Description"
                  id="description-input"
                  placeholder="Ex: Virement mensuel..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  uppercaseLabel={true}
                />
                <Input
                  label="Note (optionnel)"
                  id="note-input"
                  placeholder="Notes supplémentaires..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  uppercaseLabel={true}
                />
              </div>

              {/* Confirm CTA */}
              <Button
                onClick={handleTransfer}
                disabled={isSubmitting}
                variant="copper"
                fullWidth
                className="mt-4 font-bold"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide">
                    <CheckCircle2 size={16} />
                    Confirmer le virement
                  </span>
                )}
              </Button>
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
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 bg-surface-2/40 rounded-[24px] border border-border/20 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-surface border border-border/40 flex items-center justify-center text-accent mb-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/5 rounded-xl blur-md" />
                <ArrowLeftRight size={18} className="text-accent relative z-10" />
              </div>
              <p className="text-primary text-xs font-bold mb-1">Aucun virement</p>
              <p className="text-muted text-[10px] max-w-[200px] mb-1">Aucun virement récent trouvé sur cette période.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transfers.map(tx => (
                <div
                  key={tx._id}
                  className="bg-surface-2 border border-border/40 p-4 rounded-[16px] flex items-center justify-between transition-all shadow-sm"
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
                    <span className="font-premium-numbers font-bold text-sm text-primary">
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

      {/* Execute Confirmation Modal */}
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
              Vous êtes sur le point de transférer <span className="font-premium-numbers font-bold text-accent">{formatCurrency(parseFloat(amount || '0'), activeFromAccount.currency)}</span> de <strong>{activeFromAccount.name}</strong> vers <strong>{activeToAccount.name}</strong>.
            </p>
            
            <div className="space-y-2.5 bg-surface p-4 rounded-2xl border border-border/30">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Aperçu des nouveaux soldes :
              </span>
              
              {/* Source Account Balance Preview */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-secondary font-semibold truncate max-w-[120px]">{activeFromAccount.name}</span>
                <div className="flex items-center gap-1.5 font-premium-numbers">
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
                <div className="flex items-center gap-1.5 font-premium-numbers">
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

      {/* Success Visual Confirmation Modal */}
      <ConfirmModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        title="Virement Effectué !"
        confirmText="Super !"
        cancelText=""
        type="info"
      >
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent mx-auto animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-primary">Transfert Réussi</h4>
            <p className="text-[11px] text-secondary leading-relaxed">
              Le montant de <span className="font-premium-numbers font-bold text-accent">{formatCurrency(lastTransferDetails?.amount || 0, lastTransferDetails?.currency)}</span> a été transféré de <strong>{lastTransferDetails?.from}</strong> vers <strong>{lastTransferDetails?.to}</strong>.
            </p>
          </div>
        </div>
      </ConfirmModal>
    </>
  );
};

export default TransfersPage;
