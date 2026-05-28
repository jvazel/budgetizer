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
      await register(name, email, password);
      toast.success('Compte créé avec succès !');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col p-6 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center py-8">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(74,222,128,0.15)] bg-surface border border-border/30">
            <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-primary mb-2">Créer un compte 🚀</h1>
          <p className="text-secondary">Prenez le contrôle de vos finances</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="pt-4">
            <Button type="submit" fullWidth>
              Créer mon compte
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-secondary text-sm">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
