import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '../validators/authValidators';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await api.post(`/auth/reset-password/${token}`, data);
      setSuccess(true);
      toast.success('Mot de passe réinitialisé !');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-base flex flex-col p-6 max-w-md mx-auto">
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(74,222,128,0.15)] bg-surface border border-border/30">
              <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Réinitialisation 🔐</h1>
            <p className="text-secondary">Saisissez votre nouveau mot de passe</p>
          </div>

          <div className="bg-surface-2 p-6 rounded-2xl border border-border/40 text-center space-y-4">
            <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-md font-bold text-primary">Réinitialisation réussie</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers l'écran de connexion...
            </p>
            <div className="pt-4">
              <Link to="/login" className="text-accent text-xs font-bold hover:underline">
                Se connecter manuellement
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/login" className="text-secondary hover:text-primary text-sm font-medium hover:underline inline-flex items-center gap-1.5">
              <ArrowLeft size={16} /> Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base flex flex-col p-6 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(74,222,128,0.15)] bg-surface border border-border/30">
            <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Réinitialisation 🔐</h1>
          <p className="text-secondary">Saisissez votre nouveau mot de passe</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Nouveau mot de passe"
            {...register('password')}
            icon={Lock}
            rightIcon={showPassword ? EyeOff : Eye}
            onRightIconClick={() => setShowPassword(!showPassword)}
            error={errors.password?.message}
            required
            disabled={isSubmitting}
          />

          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmer le nouveau mot de passe"
            {...register('confirmPassword')}
            icon={Lock}
            error={errors.confirmPassword?.message}
            required
            disabled={isSubmitting}
          />

          <div className="pt-4">
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Réinitialisation...' : 'Enregistrer le nouveau mot de passe'}
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-secondary hover:text-primary text-sm font-medium hover:underline inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
