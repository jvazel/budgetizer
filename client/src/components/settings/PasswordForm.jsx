import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '../../validators';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PasswordForm = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await api.put('/users/password', data);
      reset();
      toast.success('Mot de passe mis à jour avec succès');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mot de passe incorrect');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
        <Shield size={14} className="text-accent" /> Sécurité
      </h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Ancien mot de passe <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span></label>
          <input 
            type="password"
            {...register('oldPassword')}
            className={`w-full bg-surface border px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none ${errors.oldPassword ? 'border-danger' : 'border-border/40 focus:border-accent'}`}
            required
          />
          {errors.oldPassword && <p className="text-[10px] text-danger mt-1 px-1">{errors.oldPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Nouveau mot de passe <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span></label>
          <input 
            type="password"
            {...register('newPassword')}
            className={`w-full bg-surface border px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none ${errors.newPassword ? 'border-danger' : 'border-border/40 focus:border-accent'}`}
            required
          />
          {errors.newPassword && <p className="text-[10px] text-danger mt-1 px-1">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Confirmer le nouveau mot de passe <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span></label>
          <input 
            type="password"
            {...register('confirmPassword')}
            className={`w-full bg-surface border px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none ${errors.confirmPassword ? 'border-danger' : 'border-border/40 focus:border-accent'}`}
            required
          />
          {errors.confirmPassword && <p className="text-[10px] text-danger mt-1 px-1">{errors.confirmPassword.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-surface border border-border/40 py-3 rounded-2xl text-xs font-bold text-primary hover:bg-border/20 active:scale-98 transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  );
};

export default PasswordForm;
