import React, { useState, useContext } from 'react';
import { Mail, Lock, Eye, EyeOff, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Connexion réussie !');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col p-6 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center">
            <Wallet size={32} className="text-white" />
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-primary mb-2">Bon retour 👋</h1>
          <p className="text-secondary">Entrez vos identifiants pour continuer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            required
          />
          
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

          <div className="pt-4">
            <Button type="submit" fullWidth>
              Se connecter
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-secondary text-sm">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-accent font-medium hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
