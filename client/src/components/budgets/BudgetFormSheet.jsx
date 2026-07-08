import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useCategories } from '../../hooks/useCategories';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { budgetSchema } from '../../validators';

const BudgetFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null }) => {
  const { categoriesTree } = useCategories();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      amount: '',
      categoryId: '',
      color: '#8b5cf6',
      period: 'monthly',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: initialData?.name || '',
        amount: initialData?.amount != null ? String(initialData.amount) : '',
        categoryId: initialData?.categoryId?._id || initialData?.categoryId || '',
        color: initialData?.color || '#8b5cf6',
        period: initialData?.period || 'monthly',
      });
    }
  }, [initialData, isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      await onSave({
        name: data.name,
        amount: data.amount,
        categoryId: data.categoryId,
        color: data.color,
        period: data.period,
      });
      toast.success(initialData ? 'Budget modifié' : 'Budget créé');
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

  // Only expense categories make sense for budgets usually
  const expenseCategories = categoriesTree.expense || [];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier le budget' : 'Nouveau budget'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nom du budget"
          placeholder="Ex: Courses mensuelles"
          {...register('name')}
        />
        {errors.name && <p className="text-danger text-sm">{errors.name.message}</p>}

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 text-sm text-secondary font-medium block">Montant (€)</label>
            <input
              type="number"
              step="1"
              {...register('amount')}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary font-mono text-lg focus:outline-none focus:border-accent"
            />
            {errors.amount && <p className="text-danger text-sm mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex-1">
            <Select 
              label="Période"
              {...register('period')}
            >
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
              <option value="yearly">Annuelle</option>
            </Select>
          </div>
        </div>

        <Select 
          label="Catégorie associée"
          {...register('categoryId')}
        >
          <option value="">-- Choisir une catégorie --</option>
          {expenseCategories.map(parent => (
            <optgroup key={parent._id} label={`${parent.icon} ${parent.name}`}>
              <option value={parent._id}>{parent.name}</option>
              {parent.children?.map(child => (
                <option key={child._id} value={child._id}>↳ {child.name}</option>
              ))}
            </optgroup>
          ))}
        </Select>
        {errors.categoryId && <p className="text-danger text-sm">{errors.categoryId.message}</p>}

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur d'identification</label>
          <div className="flex flex-wrap gap-2">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => register('color').onChange({ target: { value: c } })}
                className={`w-8 h-8 rounded-full transition-transform ${watch('color') === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {errors.color && <p className="text-danger text-sm mt-1">{errors.color.message}</p>}
        </div>

        <div className="pt-4 space-y-3">
          <Button type="submit" fullWidth>
            {initialData ? 'Enregistrer les modifications' : 'Créer le budget'}
          </Button>

          {initialData && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer ce budget ?")) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Budget supprimé');
                    onClose();
                  } catch (e) {
                    toast.error('Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
            >
              Supprimer le budget
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default BudgetFormSheet;
