import React, { useState, useEffect, useContext } from 'react';
import { HeaderTitle, HeaderBackButton, HeaderPortalContext } from '../components/layout/AppShell';
import AmountInput from '../components/ui/AmountInput';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeftRight, ArrowRight, AlertCircle, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import TransferConfirmModal from '../components/transfers/TransferConfirmModal';
import AmountDisplay from '../components/ui/AmountDisplay';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TransfersPage = () => {
  const { user } = useContext(AuthContext);
  const { isScrolled } = useContext(HeaderPortalContext);
  const { accounts: allAccounts, loading: accountsLoading, fetchAccounts } = useAccounts();
  const accounts = React.useMemo(() => allAccounts.filter(acc => acc.permission !== 'read'), [allAccounts]);
  const { transactions: transfers, loading: transfersLoading, addTransaction, deleteTransaction } = useTransactions({ type: 'transfer' });

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('Virement instantané');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastTransferDetails, setLastTransferDetails] = useState(null);

  // Derive default account IDs dynamically during render without useEffect
  const effectiveFromAccountId = fromAccountId || (accounts.length > 0 ? accounts[0]._id : '');
  const effectiveToAccountId = toAccountId || (accounts.length >= 2 ? accounts[1]._id : (accounts.length === 1 ? accounts[0]._id : ''));

  const activeFromAccount = accounts.find(acc => acc._id === effectiveFromAccountId);
  const activeToAccount = accounts.find(acc => acc._id === effectiveToAccountId);

  const formatCurrency = (value, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(value);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const handleTransfer = () => {
    if (!effectiveFromAccountId || !effectiveToAccountId) {
      toast.error('Veuillez sélectionner les deux comptes.');
      return;
    }

    if (effectiveFromAccountId === effectiveToAccountId) {
      toast.error('Le compte de départ et de destination doivent être différents.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    // Check balance
    const sourceAccount = accounts.find(acc => acc._id === effectiveFromAccountId);
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
        accountId: effectiveFromAccountId,
        toAccountId: effectiveToAccountId,
        amount: numericAmount,
        description: description || 'Virement instantané',
        date: date ? new Date(date) : new Date(),
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
      setDate(getTodayDateString());
      
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
    } catch (_err) {
      toast.error("Erreur lors de l'annulation du virement.");
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedTransferId(null);
    }
  };

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
                    value={effectiveFromAccountId}
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
                    <div className="text-[10px] text-muted font-bold mt-1.5 pl-1.5 uppercase tracking-wider flex items-center gap-1">
                      <span>Disponible :</span>
                      <AmountDisplay amount={activeFromAccount.balance} size="xs" type="income" />
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
                    value={effectiveToAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    required
                  >
                    {accounts.filter(acc => acc._id !== effectiveFromAccountId).map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                      </option>
                    ))}
                  </Select>
                  {activeToAccount && (
                    <div className="text-[10px] text-muted font-bold mt-1.5 pl-1.5 uppercase tracking-wider flex items-center gap-1">
                      <span>Disponible :</span>
                      <AmountDisplay amount={activeToAccount.balance} size="xs" type="income" />
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

              {/* Date, Description and Note standard inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date du virement"
                  id="date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  uppercaseLabel={true}
                />
                <Input
                  label="Description"
                  id="description-input"
                  placeholder="Ex: Virement mensuel..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  uppercaseLabel={true}
                />
              </div>
              <Input
                label="Note (optionnel)"
                id="note-input"
                placeholder="Notes supplémentaires..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                uppercaseLabel={true}
              />

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
                    <AmountDisplay amount={tx.amount} size="sm" type="transfer" />
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
        <TransferConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleExecuteTransfer}
          isSubmitting={isSubmitting}
          fromAccount={activeFromAccount}
          toAccount={activeToAccount}
          amount={parseFloat(amount || '0')}
          date={date}
          description={description}
          note={note}
        />
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
        <div className="text-center py-5 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-emerald-500/20 border border-accent/30 flex items-center justify-center text-accent mx-auto animate-bounce shadow-lg shadow-accent/15">
            <CheckCircle2 size={36} />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-extrabold text-primary tracking-tight">Transfert Réussi</h4>
            <div className="py-1">
              <AmountDisplay amount={lastTransferDetails?.amount || 0} size="2xl" type="income" />
            </div>
            <p className="text-[11.5px] text-secondary leading-relaxed">
              Montant transféré avec succès de <strong className="text-primary">{lastTransferDetails?.from}</strong> vers <strong className="text-primary">{lastTransferDetails?.to}</strong>.
            </p>
          </div>
        </div>
      </ConfirmModal>
    </>
  );
};

export default TransfersPage;
