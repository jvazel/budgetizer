import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import { savingsGoalSchema } from '../../validators';

const SavingsGoalFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null }) => {
  const { accounts } = useAccounts();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      name: '',
      targetAmount: '',
      targetDate: '',
      icon: '💰',
      color: '#3b82f6',
      accountId: '',
    },
  });

  const selectedIcon = watch('icon');
  const selectedColor = watch('color');

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        targetAmount: String(initialData.targetAmount),
        // Format targetDate to YYYY-MM-DD for date input
        targetDate: (() => {
          const dateObj = new Date(initialData.targetDate);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        icon: initialData.icon || '💰',
        color: initialData.color || '#3b82f6',
        accountId: initialData.accountId?._id || initialData.accountId || '',
      });
    } else {
      // Default to 1 year from now
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const year = oneYearLater.getFullYear();
      const month = String(oneYearLater.getMonth() + 1).padStart(2, '0');
      const day = String(oneYearLater.getDate()).padStart(2, '0');
      reset({
        name: '',
        targetAmount: '',
        targetDate: `${year}-${month}-${day}`,
        icon: '💰',
        color: '#3b82f6',
        accountId: '',
      });
    }
  }, [initialData, isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      await onSave({
        name: data.name.trim(),
        targetAmount: data.targetAmount,
        targetDate: new Date(data.targetDate).toISOString(),
        icon: data.icon,
        color: data.color,
        accountId: data.accountId || null
      });
      toast.success(initialData ? 'Objectif d\'épargne modifié' : 'Objectif d\'épargne créé');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const colors = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
    '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e',
    '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
  ];
  const icons = [
    // Finance
    '💰', '🐷', '💳', '💎', '💵', '🪙', 
    // Logement
    '🏠', '🛋️', '🔑', '🏡', '🔨', '🏢', 
    // Transports
    '🚗', '🚲', '🏍️', '🛹', '✈️', '⛵',
    // Loisirs / Voyages
    '🏝️', '🏕️', '⛰️', '🌍', '🎫', '📸', 
    // Événements
    '💍', '👶', '🎁', '🎄', '🥳', '🧸',
    // Tech & Média
    '💻', '📱', '🎮', '🎧', '📷',
    // Études / Projets
    '🎓', '📚', '💼', '🚀', '🎨', '🎸',
    // Santé & Sport
    '🏥', '🏃', '🧘', '🩺', '🍕'
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? "Modifier l'objectif" : 'Nouvel objectif d\'épargne'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nom de l'objectif"
          placeholder="Ex: Fonds de secours, Apport maison..."
          {...register('name')}
          required
        />
        {errors.name && <span className="text-xs text-danger mt-1 block">{errors.name.message}</span>}

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 text-sm text-secondary font-medium block">Cible (€) <span className="text-danger ml-0.5">*</span></label>
            <input
              type="number"
              step="0.01"
              {...register('targetAmount')}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary font-mono text-lg focus:outline-none focus:border-accent"
              placeholder="Ex: 5000"
              required
            />
            {errors.targetAmount && <span className="text-xs text-danger mt-1 block">{errors.targetAmount.message}</span>}
          </div>
          <div className="flex-1">
            <label className="mb-2 text-sm text-secondary font-medium block">Date cible <span className="text-danger ml-0.5">*</span></label>
            <input
              type="date"
              {...register('targetDate')}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch {
                  // Ignore if showPicker is not supported
                }
              }}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none focus:border-accent"
              required
            />
            {errors.targetDate && <span className="text-xs text-danger mt-1 block">{errors.targetDate.message}</span>}
          </div>
        </div>

        <Select 
          label="Compte de destination associé (optionnel)"
          value={watch('accountId')}
          onChange={(e) => setValue('accountId', e.target.value)}
        >
          <option value="">-- Aucun compte associé --</option>
          {accounts.map(acc => (
            <option key={acc._id} value={acc._id}>
              {acc.name} ({new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(acc.balance)})
            </option>
          ))}
        </Select>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Sélectionner une icône</label>
          <div className="flex flex-wrap gap-3 p-3 bg-surface-2/60 rounded-2xl border border-border/40 max-h-[110px] overflow-y-auto">
            {icons.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setValue('icon', i, { shouldValidate: true })}
                className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${selectedIcon === i ? 'bg-accent/20 border border-accent/40 scale-110' : 'hover:bg-surface-2'}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur d'identification</label>
          <div className="flex flex-wrap gap-2">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c, { shouldValidate: true })}
                className={`w-8 h-8 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button type="submit" fullWidth>
            {initialData ? 'Enregistrer les modifications' : "Créer l'objectif"}
          </Button>

          {initialData && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer cet objectif ? Les versements associés ne seront pas supprimés mais seront détachés de cet objectif.")) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Objectif d\'épargne supprimé');
                    onClose();
                  } catch (e) {
                    toast.error('Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
            >
              Supprimer l'objectif
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default SavingsGoalFormSheet;
