import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import CreditAccountBottomSheet from './CreditAccountBottomSheet';
import { accountSchema } from '../../validators';

const AccountFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      balance: '',
      color: '#4ade80',
      includeInTotal: true,
    },
  });

  const formType = watch('type');

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: initialData?.name || '',
        type: initialData?.type || 'checking',
        balance: initialData?.balance != null ? initialData.balance.toString() : '',
        color: initialData?.color || '#4ade80',
        includeInTotal: initialData?.includeInTotal ?? true,
      });
    }
  }, [initialData, isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      await onSave({ ...data, balance: parseFloat(data.balance) || 0 });
      toast.success(initialData ? 'Compte modifié' : 'Compte créé');
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  const colors = ['#4ade80', '#60a5fa', '#a78bfa', '#f87171', '#fbbf24', '#f472b6', '#2dd4bf'];

  if (formType === 'credit') {
    return (
      <CreditAccountBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        initialData={initialData}
        onSave={onSave}
        onDelete={onDelete}
        onTypeChange={(newType) => setValue('type', newType)}
      />
    );
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier le compte' : 'Nouveau compte'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nom du compte"
          placeholder="ex: Compte Courant"
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}

        <Select 
          label="Type de compte"
          value={watch('type')} 
          onChange={(e) => setValue('type', e.target.value)}
        >
          <option value="checking">Courant</option>
          <option value="savings">Épargne</option>
          <option value="cash">Espèces</option>
          <option value="credit">Crédit</option>
          <option value="investment">Investissement</option>
        </Select>

        <Input
          label="Solde initial"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('balance')}
          className="font-mono"
        />
        {errors.balance && <p className="text-sm text-danger">{errors.balance.message}</p>}

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur</label>
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c)}
                className={`w-8 h-8 rounded-full transition-transform ${watch('color') === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <label className="text-sm text-primary font-medium">Inclure dans le solde total</label>
          <input 
            type="checkbox" 
            {...register('includeInTotal')}
            className="w-5 h-5 accent-accent"
          />
        </div>

        <div className="pt-4 space-y-3">
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting 
              ? (initialData ? 'Enregistrement...' : 'Création...') 
              : (initialData ? 'Enregistrer les modifications' : 'Créer le compte')}
          </Button>

          {initialData && onDelete && (
            <button
              type="button"
              onClick={async () => {
                const confirmMsg = "Êtes-vous sûr de vouloir supprimer ce compte ?\n\nATTENTION : Cette action supprimera définitivement toutes les transactions (dépenses, recettes, virements) et transactions planifiées qui lui sont associées. Cette action est irréversible.";
                if (window.confirm(confirmMsg)) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Compte supprimé');
                  } catch (e) {
                    toast.error('Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
            >
              Supprimer le compte
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default AccountFormSheet;
