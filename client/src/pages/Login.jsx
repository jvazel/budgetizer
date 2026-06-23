import React, { useState, useContext } from 'react';
import { Mail, Lock, Eye, EyeOff, Fingerprint, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [shouldShake, setShouldShake] = useState(false);
  const { login, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const isWebAuthnSupported = typeof window !== 'undefined' && 
    window.PublicKeyCredential !== undefined && 
    navigator.credentials !== undefined;

  const handleWebAuthnLogin = async () => {
    try {
      toast.loading("Génération du défi de connexion...");
      const optionsRes = await api.post('/webauthn/login/options', { email: email || undefined });
      const options = optionsRes.data;
      toast.dismiss();

      // Convert Base64URL to ArrayBuffer
      const base64urlToArrayBuffer = (base64url) => {
        try {
          const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
          const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray.buffer;
        } catch (e) {
          console.error("Failed to parse base64url string:", base64url, e);
          return new ArrayBuffer(0);
        }
      };

      options.challenge = base64urlToArrayBuffer(options.challenge);
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials
          .map(cred => ({
            ...cred,
            id: base64urlToArrayBuffer(cred.id)
          }))
          .filter(cred => cred.id.byteLength > 0);
      }

      toast.loading("Authentification biométrique en cours...");
      const assertion = await navigator.credentials.get({ publicKey: options });
      toast.dismiss();

      if (!assertion) {
        throw new Error("L'authentification a été annulée ou aucun périphérique n'a été détecté.");
      }

      // Convert ArrayBuffer to Base64URL
      const arrayBufferToBase64url = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };

      const assertionResponse = {
        id: assertion.id,
        rawId: arrayBufferToBase64url(assertion.rawId),
        type: assertion.type,
        response: {
          clientDataJSON: arrayBufferToBase64url(assertion.response.clientDataJSON),
          authenticatorData: arrayBufferToBase64url(assertion.response.authenticatorData),
          signature: arrayBufferToBase64url(assertion.response.signature),
          userHandle: assertion.response.userHandle ? arrayBufferToBase64url(assertion.response.userHandle) : undefined
        }
      };

      toast.loading("Vérification sur le serveur...");
      const verifyRes = await api.post('/webauthn/login/verify', {
        body: assertionResponse,
        challenge: arrayBufferToBase64url(options.challenge)
      });
      toast.dismiss();

      const user = verifyRes.data;
      localStorage.setItem('token', user.token);
      setUser(user);
      toast.success('Connexion biométrique réussie !');
      navigate('/');
    } catch (err) {
      toast.dismiss();
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message || "Échec de l'authentification biométrique.";
      const detailError = err.response?.data?.error;
      const fullMessage = detailError ? `${errorMessage} (${detailError})` : errorMessage;
      
      // Auto-reset local storage flags if the credential is unknown on the server (400 Bad Request / unknown key)
      if (errorMessage.includes("inconnu") || errorMessage.includes("unknown") || err.response?.status === 400) {
        localStorage.removeItem('webauthn_registered_on_device');
        localStorage.removeItem('webauthn_dismissed_device');
      }
      
      toast.error(fullMessage);
    }
  };

  const handleResetWebAuthn = () => {
    localStorage.removeItem('webauthn_registered_on_device');
    localStorage.removeItem('webauthn_dismissed_device');
    toast.success("Les paramètres biométriques de cet appareil ont été réinitialisés. Connectez-vous avec votre mot de passe pour les réactiver.");
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setShouldShake(false);
    try {
      sessionStorage.setItem('just_logged_in', 'true');
      await login(email, password);
      toast.success('Connexion réussie !');
      navigate('/');
    } catch (err) {
      sessionStorage.removeItem('just_logged_in');
      const msg = err.response?.data?.message || 'Adresse e-mail ou mot de passe incorrect.';
      setError(msg);
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 400);
      toast.error(msg);
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
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-primary mb-2">Bon retour 👋</h1>
          <p className="text-secondary">Entrez vos identifiants pour continuer</p>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-4 ${shouldShake ? 'animate-shake' : ''}`}>
          {error && (
            <div className="bg-danger-dim border border-danger/20 text-danger rounded-2xl p-4 text-sm flex items-start gap-3 shadow-[0_0_20px_rgba(244,63,94,0.03)] transition-all">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-danger" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-primary">Échec de la connexion</p>
                <p className="text-xs text-secondary mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <Input
            id="email"
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={handleEmailChange}
            icon={Mail}
            error={!!error}
            required
          />
          
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mot de passe"
            value={password}
            onChange={handlePasswordChange}
            icon={Lock}
            rightIcon={showPassword ? EyeOff : Eye}
            onRightIconClick={() => setShowPassword(!showPassword)}
            error={!!error}
            required
          />

          <div className="text-right px-1">
            <Link 
              to="/forgot-password" 
              className="text-xs font-bold text-accent hover:text-accent/80 transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <div className="pt-2">
            <Button type="submit" variant="copper" fullWidth>
              Se connecter
            </Button>
          </div>
        </form>

        {isWebAuthnSupported && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-border/40"></div>
              <span className="px-3 text-xs text-muted font-bold uppercase tracking-wider">ou</span>
              <div className="flex-1 border-t border-border/40"></div>
            </div>

            <Button 
              type="button" 
              variant="secondary" 
              fullWidth 
              onClick={handleWebAuthnLogin}
              className="flex items-center justify-center gap-2"
            >
              <Fingerprint size={16} className="text-accent" />
              Se connecter avec la biométrie
            </Button>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={handleResetWebAuthn}
                className="text-[10px] font-bold text-muted hover:text-accent transition-colors"
              >
                Problème avec la biométrie ? Réinitialiser l'appareil
              </button>
            </div>
          </>
        )}

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
