import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '../../validators';
import { User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ProfileForm = ({ user, setUser }) => {
  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'U';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const res = await api.put('/users/profile', data);
      setUser(res.data);
      toast.success('Profil mis à jour avec succès');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    }
  };

  return (
    <div className="space-y-6">
      {/* Profil Header */}
      <div className="flex items-center gap-3.5 bg-surface-2 p-5 rounded-[28px] border border-border/40">
        <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-lg text-accent shadow-inner">
          {initials}
        </div>
        <div>
          <h2 className="text-base font-extrabold text-primary">{user?.name}</h2>
          <p className="text-xs text-muted">{user?.email}</p>
        </div>
      </div>

      {/* Profile Modification Form */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
          <User size={14} className="text-accent" /> Mon Profil
        </h3>
        
        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary">Nom d'affichage <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span></label>
            <input 
              type="text"
              {...register('name')}
              className={`w-full bg-surface border px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none ${errors.name ? 'border-danger' : 'border-border/40 focus:border-accent'}`}
              required
            />
            {errors.name && <p className="text-[10px] text-danger mt-1 px-1">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary">Adresse Email <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span></label>
            <input 
              type="email"
              {...register('email')}
              className={`w-full bg-surface border px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none ${errors.email ? 'border-danger' : 'border-border/40 focus:border-accent'}`}
              required
            />
            {errors.email && <p className="text-[10px] text-danger mt-1 px-1">{errors.email.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-surface border border-border/40 py-3 rounded-2xl text-xs font-bold text-primary hover:bg-border/20 active:scale-98 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le profil'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;
