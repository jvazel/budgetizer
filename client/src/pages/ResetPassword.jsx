import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Wallet, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      return toast.error('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (password !== confirmPassword) {
      return toast.error('Les mots de passe ne correspondent pas');
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      toast.success('Mot de passe réinitialisé !');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
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

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Réinitialisation 🔐</h1>
          <p className="text-secondary">Saisissez votre nouveau mot de passe</p>
        </div>

        {success ? (
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowPassword(!showPassword)}
              required
              disabled={loading}
            />

            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={Lock}
              required
              disabled={loading}
            />

            <div className="pt-4">
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Réinitialisation...' : 'Enregistrer le nouveau mot de passe'}
              </Button>
            </div>
          </form>
        )}

        {!success && (
          <div className="mt-8 text-center">
            <Link to="/login" className="text-secondary hover:text-primary text-sm font-medium hover:underline inline-flex items-center gap-1.5">
              <ArrowLeft size={16} /> Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
