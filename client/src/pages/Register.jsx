import { useState, useContext } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../validators/authValidators';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { register: authRegister } = useContext(AuthContext);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');
  const getPasswordStrength = () => {
    if (!passwordValue) return 0;
    if (passwordValue.length < 6) return 1;
    if (passwordValue.length < 10) return 2;
    return 3;
  };

  const strengthColors = ['bg-surface-2', 'bg-danger', 'bg-warning', 'bg-accent'];
  const strength = getPasswordStrength();

  const onSubmit = async (data) => {
    try {
      sessionStorage.setItem('just_logged_in', 'true');
      await authRegister(data.name, data.email, data.password);
      toast.success('Compte créé avec succès !');
      navigate('/');
    } catch (error) {
      sessionStorage.removeItem('just_logged_in');
      toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Ambient Background Glow Orbs */}
      <div className="bg-glow-orb glow-orb-indigo w-[300px] h-[300px] -top-20 -left-20" />
      <div className="bg-glow-orb glow-orb-amber w-[250px] h-[250px] top-[40%] -right-20" />

      <div className="flex-1 flex flex-col justify-center py-6 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 premium-card-inner flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(217,119,6,0.2)] bg-surface border border-border/30">
            <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="banky-card p-6 relative overflow-hidden select-none">
          <div className="glass-reflection" />
          
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-2xl font-extrabold text-primary mb-1 tracking-tight">Créer un compte 🚀</h1>
            <p className="text-xs text-secondary">Prenez le contrôle de vos finances</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
            <Input
              id="name"
              placeholder="Prénom"
              {...register('name')}
              icon={User}
              error={errors.name?.message}
              required
            />

            <Input
              id="email"
              type="email"
              placeholder="Adresse email"
              {...register('email')}
              icon={Mail}
              error={errors.email?.message}
              required
            />
            
            <div className="space-y-2">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                {...register('password')}
                icon={Lock}
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword(!showPassword)}
                error={errors.password?.message}
                required
              />
              {passwordValue && passwordValue.length > 0 && (
                <div className="flex h-1 gap-1 px-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-colors ${
                        strength >= level ? strengthColors[strength] : 'bg-surface-2'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmer le mot de passe"
              {...register('confirmPassword')}
              icon={Lock}
              error={errors.confirmPassword?.message}
              required
            />

            <div className="pt-2">
              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Créer mon compte'}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center relative z-10">
          <p className="text-secondary text-xs">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-copper font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
