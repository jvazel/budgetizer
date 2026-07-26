import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import { savingsActionSchema } from '../../validators';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const SavingsActionFormSheet = ({ isOpen, onClose, goal, actionType, onSuccess }) => {
  const { accounts } = useAccounts();
  const { categoriesTree } = useCategories();
  const { addTransaction } = useTransactions();

  const { register, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(savingsActionSchema),
    defaultValues: {
      amount: '',
      accountId: '',
      date: new Date().toISOString().split('T')[0],
      note: '',
      categoryId: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      
      let defaultAccountId = '';
      if (accounts.length > 0) {
        const goalAccId = goal?.accountId?._id || goal?.accountId;
        const selectableAccounts = goalAccId 
          ? accounts.filter(a => a._id !== goalAccId)
          : accounts;
        const defaultAcc = selectableAccounts.find(a => a.type === 'checking' || a.type === 'cash') || selectableAccounts[0];
        defaultAccountId = defaultAcc ? defaultAcc._id : '';
      }

      let defaultCategoryId = '';
      if (goal && categoriesTree) {
        const list = actionType === 'deposit' ? categoriesTree.expense : categoriesTree.income;
        if (list && list.length > 0) {
          const found = list.find(c => c.name.toLowerCase().includes('épargne') || c.name.toLowerCase().includes('savings'));
          defaultCategoryId = found?._id || '';
        }
      }

      reset({
        amount: '',
        accountId: defaultAccountId,
        date: today,
        note: '',
        categoryId: defaultCategoryId,
      });
    }
  }, [isOpen, accounts, goal, categoriesTree, actionType, reset]);

  if (!goal) return null;

  const isDeposit = actionType === 'deposit';
  const watchAccountId = watch('accountId');

  const onSubmit = async (data) => {
    try {
      const goalAccId = goal.accountId?._id || goal.accountId;

      let payload;
      if (goalAccId) {
        payload = {
          accountId: isDeposit ? data.accountId : goalAccId,
          toAccountId: isDeposit ? goalAccId : data.accountId,
          type: 'transfer',
          amount: data.amount,
          description: isDeposit ? `Épargne : ${goal.name}` : `Retrait épargne : ${goal.name}`,
          date: new Date(data.date).toISOString(),
          note: data.note?.trim() || '',
          savingsGoalId: goal._id
        };
      } else {
        payload = {
          accountId: data.accountId,
          categoryId: data.categoryId || null,
          type: isDeposit ? 'expense' : 'income',
          amount: data.amount,
          description: isDeposit ? `Épargne : ${goal.name}` : `Retrait épargne : ${goal.name}`,
          date: new Date(data.date).toISOString(),
          note: data.note?.trim() || '',
          savingsGoalId: goal._id
        };
      }

      await addTransaction(payload);
      toast.success(isDeposit ? 'Versement enregistré' : 'Retrait enregistré');
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'opération');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span>{goal.icon}</span>
            <span>{isDeposit ? 'Ajouter de l\'épargne' : 'Retirer de l\'épargne'}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">
            Objectif : <strong className="text-primary">{goal.name}</strong>
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors shrink-0">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="mb-2 text-sm text-secondary font-medium block">
            Montant à {isDeposit ? 'verser' : 'retirer'} (€) <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register('amount')}
            className={`w-full h-[52px] px-4 bg-surface-2 border rounded-2xl text-primary font-mono text-xl focus:outline-none ${errors.amount ? 'border-danger' : 'border-border focus:border-accent'}`}
            placeholder="0.00"
            required
            autoFocus
          />
          {errors.amount && <p className="text-[10px] text-danger mt-1 px-1">{errors.amount.message}</p>}
        </div>

        {/* Account Selection */}
        <Select 
          label={
            goal.accountId ? (
              isDeposit 
                ? `Débiter du compte d'origine` 
                : `Créditer sur le compte de destination`
            ) : (
              isDeposit ? 'Débiter du compte' : 'Créditer sur le compte'
            )
          }
          value={watchAccountId}
          onChange={(e) => setValue('accountId', e.target.value)}
          required
        >
          <option value="">-- Sélectionner un compte --</option>
          {accounts
            .filter(acc => !goal.accountId || (acc._id !== (goal.accountId._id || goal.accountId)))
            .map(acc => (
              <option key={acc._id} value={acc._id}>
                {acc.name} ({new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(acc.balance)})
              </option>
            ))}
        </Select>

        {goal.accountId && (
          <span className="text-[10px] text-muted mt-1 leading-normal block px-1">
            {isDeposit ? (
              <>Le versement sera crédité sur le compte lié à cet objectif : <strong>{goal.accountId.name || 'Compte associé'}</strong></>
            ) : (
              <>Le retrait sera débité du compte lié à cet objectif : <strong>{goal.accountId.name || 'Compte associé'}</strong></>
            )}
          </span>
        )}

        {/* Optional Category */}
        {!goal.accountId && (
          <Select 
            label="Catégorie (optionnel)"
            value={watch('categoryId')}
            onChange={(e) => setValue('categoryId', e.target.value)}
          >
            <option value="">-- Aucune catégorie --</option>
            {(isDeposit ? categoriesTree.expense : categoriesTree.income)?.map(parent => (
              <optgroup key={parent._id} label={`${parent.icon} ${parent.name}`}>
                <option value={parent._id}>{parent.name}</option>
                {parent.children?.map(child => (
                  <option key={child._id} value={child._id}>↳ {child.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        )}

        {/* Date and Note */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 text-sm text-secondary font-medium block">
              Date <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span>
            </label>
            <input
              type="date"
              {...register('date')}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch {
                  // Ignore if showPicker is not supported
                }
              }}
              className={`w-full h-[52px] px-4 bg-surface-2 border rounded-2xl text-primary focus:outline-none ${errors.date ? 'border-danger' : 'border-border focus:border-accent'}`}
              required
            />
          </div>
          <div>
            <label className="mb-2 text-sm text-secondary font-medium block">Note (optionnel)</label>
            <input
              type="text"
              {...register('note')}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none"
              placeholder="Note..."
            />
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" fullWidth variant={isDeposit ? 'accent' : 'info'} disabled={isSubmitting}>
            {isSubmitting ? (isDeposit ? 'Enregistrement...' : 'Enregistrement...') : (isDeposit ? 'Confirmer le versement' : 'Confirmer le retrait')}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};

export default SavingsActionFormSheet;
