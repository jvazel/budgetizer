import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Lien de réinitialisation envoyé !');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Ambient Background Glow Orbs */}
      <div className="bg-glow-orb glow-orb-indigo w-[300px] h-[300px] -top-20 -left-20" />
      <div className="bg-glow-orb glow-orb-amber w-[250px] h-[250px] top-[40%] -right-20" />

      <div className="flex-1 flex flex-col justify-center relative z-10">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(217,119,6,0.25)] bg-surface border border-border/30">
            <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary mb-2 tracking-tight">Mot de passe oublié 🔑</h1>
          <p className="text-secondary">Saisissez votre e-mail pour réinitialiser votre mot de passe</p>
        </div>

        {submitted ? (
          <div className="bg-surface-2 p-6 rounded-2xl border border-border/40 text-center space-y-4">
            <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-md font-bold text-primary">Vérifiez vos e-mails</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Si un compte existe pour <strong>{email}</strong>, un e-mail a été envoyé avec les instructions pour réinitialiser le mot de passe.
            </p>
            <p className="text-[10px] text-muted leading-relaxed">
              (En mode développement local, vérifiez la console d'exécution du serveur pour accéder au lien de réinitialisation)
            </p>
            <div className="pt-4">
              <Link to="/login" className="text-accent text-xs font-bold hover:underline flex items-center justify-center gap-1">
                <ArrowLeft size={12} /> Retour à la connexion
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
              disabled={loading}
            />

            <div className="pt-4">
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </Button>
            </div>
          </form>
        )}

        {!submitted && (
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

export default ForgotPassword;
