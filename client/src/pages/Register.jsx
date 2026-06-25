import React, { useState, useContext } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  const strengthColors = ['bg-surface-2', 'bg-danger', 'bg-warning', 'bg-accent'];
  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Les mots de passe ne correspondent pas');
    }
    if (password.length < 6) {
      return toast.error('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    try {
      sessionStorage.setItem('just_logged_in', 'true');
      await register(name, email, password);
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

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <Input
              id="name"
              placeholder="Prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={User}
              required
            />

            <Input
              id="email"
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />
            
            <div className="space-y-2">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword(!showPassword)}
                required
              />
              {password.length > 0 && (
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={Lock}
              required
            />

            <div className="pt-2">
              <Button type="submit" fullWidth>
                Créer mon compte
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
