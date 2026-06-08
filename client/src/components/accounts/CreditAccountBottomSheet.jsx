import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import ConfirmModal from '../ui/ConfirmModal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { X, Landmark } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import api from '../../services/api';

const CreditAccountBottomSheet = ({ isOpen, onClose, onSave, onDelete, onTypeChange, initialData = null }) => {
  const { accounts } = useAccounts(isOpen); // Fetch accounts when opened to have the latest list

  const [name, setName] = useState('');
  const [color, setColor] = useState('#f87171');
  const [initialAmount, setInitialAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleteConfirmOpen(false);
      await onDelete(initialData._id);
      onClose();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Filter checking & savings accounts to use as source account
  const sourceAccounts = accounts.filter(acc => acc.type === 'checking' || acc.type === 'savings');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setColor(initialData.color || '#f87171');
      if (initialData.creditDetails) {
        setInitialAmount(initialData.creditDetails.initialAmount?.toString() || '');
        setInterestRate(initialData.creditDetails.interestRate?.toString() || '');
        setDurationMonths(initialData.creditDetails.durationMonths?.toString() || '');
        
        if (initialData.creditDetails.startDate) {
          const dateObj = new Date(initialData.creditDetails.startDate);
          setStartDate(dateObj.toISOString().split('T')[0]);
        } else {
          setStartDate('');
        }

        // Fetch source account from scheduled transaction
        if (initialData.creditDetails.scheduledTransactionId) {
          api.get('/scheduled')
            .then(res => {
              const st = res.data.find(s => s._id === initialData.creditDetails.scheduledTransactionId);
              if (st) {
                setSourceAccountId(st.accountId?._id || st.accountId || '');
              }
            })
            .catch(err => console.error('Error fetching source account:', err));
        }
      }
    } else {
      setName('');
      setColor('#f87171');
      setInitialAmount('');
      setInterestRate('');
      setDurationMonths('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setSourceAccountId('');
    }
    setSubmitting(false);
  }, [initialData, isOpen]);

  // Live calculations
  const C = parseFloat(initialAmount) || 0;
  const t = parseFloat(interestRate) || 0;
  const n = parseInt(durationMonths) || 0;

  let monthlyPayment = 0;
  let firstMonthInterest = 0;

  if (C > 0 && n > 0) {
    if (t === 0) {
      monthlyPayment = C / n;
      firstMonthInterest = 0;
    } else {
      const monthlyRate = t / 100 / 12;
      monthlyPayment = (C * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
      firstMonthInterest = C * (t / 100 / 12);
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!sourceAccountId) {
      toast.error('Veuillez sélectionner un compte source');
      return;
    }
    if (C <= 0 || n <= 0) {
      toast.error('Veuillez renseigner un capital et une durée valides');
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name,
        type: 'credit',
        color,
        includeInTotal: true,
        sourceAccountId,
        creditDetails: {
          initialAmount: C,
          interestRate: t,
          durationMonths: n,
          startDate: new Date(startDate)
        }
      });
      onClose();
    } catch (error) {
      // Error handled by caller
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  };

  const colors = ['#f87171', '#b91c1c', '#4ade80', '#60a5fa', '#a78bfa', '#fbbf24', '#f472b6', '#2dd4bf'];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
            <Landmark size={18} />
          </div>
          <h2 className="text-xl font-bold text-primary">
            {initialData ? 'Modifier le crédit' : 'Nouveau compte crédit'}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 no-scrollbar pb-6">
        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Type de compte</label>
          <select 
            value="credit" 
            onChange={(e) => onTypeChange && onTypeChange(e.target.value)}
            disabled={!!initialData}
            className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="checking">Courant</option>
            <option value="savings">Épargne</option>
            <option value="cash">Espèces</option>
            <option value="credit">Crédit</option>
            <option value="investment">Investissement</option>
          </select>
        </div>

        <Input
          label="Nom du crédit"
          placeholder="ex: Prêt Immobilier, Crédit Auto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur de la carte</label>
          <div className="flex flex-wrap gap-2 py-2 px-3">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border/40"></div>
          </div>
          <div className="relative flex justify-start text-xs font-bold uppercase tracking-wider">
            <span className="bg-background pr-3 text-secondary">Détails du crédit</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Capital emprunté"
            type="number"
            step="0.01"
            placeholder="150000"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            required
            className="font-mono [&>label]:min-h-[40px]"
          />
          <Input
            label="Taux d'intérêt annuel (%)"
            type="number"
            step="0.01"
            placeholder="3.50"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            required
            className="font-mono [&>label]:min-h-[40px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Durée (mois)"
            type="number"
            placeholder="240"
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            required
            className="font-mono [&>label]:min-h-[40px]"
          />
          <Input
            label="Date de 1ère échéance"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onClick={(e) => {
              try {
                e.target.showPicker();
              } catch (err) {}
            }}
            required
            className="[&>label]:min-h-[40px]"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Compte source des prélèvements</label>
          <select 
            value={sourceAccountId} 
            onChange={(e) => setSourceAccountId(e.target.value)}
            className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none focus:border-accent"
            required
          >
            <option value="">Sélectionner un compte courant</option>
            {sourceAccounts.map(acc => (
              <option key={acc._id} value={acc._id}>
                {acc.name} ({formatCurrency(acc.balance)})
              </option>
            ))}
          </select>
        </div>

        {C > 0 && n > 0 && (
          <div className="bg-surface-2 p-4 rounded-2xl border border-border/40 mt-4">
            <p className="text-xs text-secondary font-medium uppercase tracking-wider">Mensualité estimée</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-primary font-mono">{formatCurrency(monthlyPayment)}</span>
              <span className="text-xs text-muted">/ mois</span>
            </div>
            <p className="text-[10px] text-muted mt-1">
              {t === 0 ? (
                'Crédit sans intérêts'
              ) : (
                `dont ~${formatCurrency(firstMonthInterest)} d'intérêts le 1er mois`
              )}
            </p>
          </div>
        )}

        <div className="pt-4 space-y-3">
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting 
              ? (initialData ? 'Enregistrement...' : 'Création...') 
              : (initialData ? 'Enregistrer les modifications' : 'Créer le crédit')}
          </Button>

          {initialData && onDelete && (
            <>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
              >
                Supprimer le crédit
              </button>

              <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le crédit"
                confirmText="Supprimer"
                type="danger"
              >
                <div className="text-xs text-secondary leading-relaxed space-y-2">
                  <p>
                    Êtes-vous sûr de vouloir supprimer le compte crédit <span className="font-bold text-primary">"{name}"</span> ?
                  </p>
                  <p className="font-semibold text-danger">
                    ATTENTION : Cela supprimera définitivement le compte, son historique, ainsi que l'échéancier de remboursement planifié associé. Cette action est irréversible.
                  </p>
                </div>
              </ConfirmModal>
            </>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default CreditAccountBottomSheet;
