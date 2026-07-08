import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ConfirmModal from '../ui/ConfirmModal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { X, Landmark } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import api from '../../services/api';
import { creditAccountSchema } from '../../validators';

const CreditAccountBottomSheet = ({ isOpen, onClose, onSave, onDelete, onTypeChange, initialData = null }) => {
  const { accounts } = useAccounts(isOpen);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting }, reset, watch: formWatch } = useForm({
    resolver: zodResolver(creditAccountSchema),
    defaultValues: {
      name: '',
      color: '#f87171',
      initialAmount: '',
      interestRate: '',
      durationMonths: '',
      startDate: new Date().toISOString().split('T')[0],
      sourceAccountId: ''
    }
  });

  const formValues = formWatch();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const dateObj = initialData.creditDetails?.startDate
          ? new Date(initialData.creditDetails.startDate).toISOString().split('T')[0]
          : '';

        reset({
          name: initialData.name || '',
          color: initialData.color || '#f87171',
          initialAmount: initialData.creditDetails?.initialAmount?.toString() || '',
          interestRate: initialData.creditDetails?.interestRate?.toString() || '',
          durationMonths: initialData.creditDetails?.durationMonths?.toString() || '',
          startDate: dateObj,
          sourceAccountId: ''
        });

        if (initialData.creditDetails?.scheduledTransactionId) {
          api.get('/scheduled')
            .then(res => {
              const st = res.data.find(s => s._id === initialData.creditDetails.scheduledTransactionId);
              if (st) {
                setValue('sourceAccountId', st.accountId?._id || st.accountId || '');
              }
            })
            .catch(err => console.error('Error fetching source account:', err));
        }
      } else {
        reset({
          name: '',
          color: '#f87171',
          initialAmount: '',
          interestRate: '',
          durationMonths: '',
          startDate: new Date().toISOString().split('T')[0],
          sourceAccountId: ''
        });
      }
    }
  }, [initialData, isOpen, reset, setValue]);

  const handleDeleteConfirm = async () => {
    try {
      if (onDelete) {
        await onDelete(initialData._id);
        toast.success('Crédit supprimé');
      }
      onClose();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const sourceAccounts = accounts.filter(acc => acc.type === 'checking' || acc.type === 'savings');

  // Live calculations from watched form values
  const C = parseFloat(formValues.initialAmount) || 0;
  const t = parseFloat(formValues.interestRate) || 0;
  const n = parseInt(formValues.durationMonths) || 0;

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

  const onSubmit = async (data) => {
    try {
      await onSave({
        name: data.name,
        type: 'credit',
        color: data.color,
        includeInTotal: true,
        sourceAccountId: data.sourceAccountId,
        creditDetails: {
          initialAmount: data.initialAmount,
          interestRate: data.interestRate,
          durationMonths: data.durationMonths,
          startDate: new Date(data.startDate)
        }
      });
      onClose();
    } catch (error) {
      // Error handled by caller
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 no-scrollbar pb-6">
        <Select 
          label="Type de compte"
          value={formValues.type || 'credit'} 
          onChange={(e) => { setValue('type', e.target.value); onTypeChange && onTypeChange(e.target.value); }}
          disabled={!!initialData}
        >
          <option value="checking">Courant</option>
          <option value="savings">Épargne</option>
          <option value="cash">Espèces</option>
          <option value="credit">Crédit</option>
          <option value="investment">Investissement</option>
        </Select>

        <Input
          label="Nom du crédit"
          placeholder="ex: Prêt Immobilier, Crédit Auto"
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur de la carte</label>
          <div className="flex flex-wrap gap-2 py-2 px-3">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c)}
                className={`w-8 h-8 rounded-full transition-transform ${formValues.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
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
            {...register('initialAmount')}
            required
            className="font-mono [&>label]:min-h-[40px]"
          />
          {errors.initialAmount && <p className="text-sm text-danger">{errors.initialAmount.message}</p>}
          <Input
            label="Taux d'intérêt annuel (%)"
            type="number"
            step="0.01"
            placeholder="3.50"
            {...register('interestRate')}
            required
            className="font-mono [&>label]:min-h-[40px]"
          />
          {errors.interestRate && <p className="text-sm text-danger">{errors.interestRate.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Durée (mois)"
            type="number"
            placeholder="240"
            {...register('durationMonths')}
            required
            className="font-mono [&>label]:min-h-[40px]"
          />
          {errors.durationMonths && <p className="text-sm text-danger">{errors.durationMonths.message}</p>}
          <Input
            label="Date de 1ère échéance"
            type="date"
            {...register('startDate')}
            onClick={(e) => {
              try {
                e.target.showPicker();
              } catch (err) {}
            }}
            required
            className="[&>label]:min-h-[40px]"
          />
          {errors.startDate && <p className="text-sm text-danger">{errors.startDate.message}</p>}
        </div>

        <Select 
          label="Compte source des prélèvements"
          value={formValues.sourceAccountId} 
          onChange={(e) => setValue('sourceAccountId', e.target.value)}
          required
        >
          <option value="">Sélectionner un compte courant</option>
          {sourceAccounts.map(acc => (
            <option key={acc._id} value={acc._id}>
              {acc.name} ({formatCurrency(acc.balance)})
            </option>
          ))}
        </Select>
        {errors.sourceAccountId && <p className="text-sm text-danger">{errors.sourceAccountId.message}</p>}

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
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting 
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
                    Êtes-vous sûr de vouloir supprimer le compte crédit <span className="font-bold text-primary">"{initialData.name}"</span> ?
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
