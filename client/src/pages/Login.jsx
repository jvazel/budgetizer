import React, { useState, useContext } from 'react';
import { Mail, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';
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
  const { login, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showWebAuthnPrompt, setShowWebAuthnPrompt] = useState(false);
  const [tempUser, setTempUser] = useState(null);

  const isWebAuthnSupported = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;

  const handleWebAuthnLogin = async () => {
    try {
      toast.loading("Génération du défi de connexion...");
      const optionsRes = await api.post('/webauthn/login/options', { email: email || undefined });
      const options = optionsRes.data;
      toast.dismiss();

      // Convert Base64URL to ArrayBuffer
      const base64urlToArrayBuffer = (base64url) => {
        const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
        const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray.buffer;
      };

      options.challenge = base64urlToArrayBuffer(options.challenge);
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map(cred => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id)
        }));
      }

      toast.loading("Authentification biométrique en cours...");
      const assertion = await navigator.credentials.get({ publicKey: options });
      toast.dismiss();

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
      toast.error(err.response?.data?.message || err.message || "Échec de l'authentification biométrique.");
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!tempUser) return;
    try {
      let deviceName = 'Appareil';
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) {
        deviceName = 'Android';
      } else if (/ipad|iphone|ipod/i.test(ua)) {
        deviceName = 'iOS Device';
      } else if (/macintosh/i.test(ua)) {
        deviceName = 'Mac';
      } else if (/windows/i.test(ua)) {
        deviceName = 'PC Windows';
      } else if (/linux/i.test(ua)) {
        deviceName = 'Linux';
      }
      
      if (/chrome|crios/i.test(ua)) {
        deviceName += ' (Chrome)';
      } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
        deviceName += ' (Safari)';
      } else if (/firefox|fxios/i.test(ua)) {
        deviceName += ' (Firefox)';
      } else if (/edge/i.test(ua)) {
        deviceName += ' (Edge)';
      }

      toast.loading("Génération des options d'enregistrement...");
      const optionsRes = await api.get('/webauthn/register/options');
      const options = optionsRes.data;
      toast.dismiss();

      // Convert Base64URL to ArrayBuffer
      const base64urlToArrayBuffer = (base64url) => {
        const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
        const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray.buffer;
      };

      options.challenge = base64urlToArrayBuffer(options.challenge);
      options.user.id = base64urlToArrayBuffer(options.user.id);
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(cred => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id)
        }));
      }

      toast.loading("Veuillez authentifier votre appareil...");
      const credential = await navigator.credentials.create({ publicKey: options });
      toast.dismiss();

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

      const attestationResponse = {
        id: credential.id,
        rawId: arrayBufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: arrayBufferToBase64url(credential.response.clientDataJSON),
          attestationObject: arrayBufferToBase64url(credential.response.attestationObject),
          transports: credential.response.getTransports ? credential.response.getTransports() : []
        },
        deviceName: deviceName
      };

      toast.loading("Enregistrement du périphérique sur le serveur...");
      await api.post('/webauthn/register/verify', attestationResponse);
      toast.dismiss();

      toast.success('Connexion biométrique activée avec succès !');
      localStorage.setItem('webauthn_registered_on_device', 'true');
      setShowWebAuthnPrompt(false);
      navigate('/');
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Échec de l'activation.");
      setShowWebAuthnPrompt(false);
      navigate('/');
    }
  };

  const handleDismissPrompt = () => {
    localStorage.setItem('webauthn_dismissed_device', 'true');
    setShowWebAuthnPrompt(false);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const loggedUser = await login(email, password);
      toast.success('Connexion réussie !');

      const isRegistered = localStorage.getItem('webauthn_registered_on_device');
      const isDismissed = localStorage.getItem('webauthn_dismissed_device');

      if (isWebAuthnSupported && !isRegistered && !isDismissed) {
        setTempUser(loggedUser);
        setShowWebAuthnPrompt(true);
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col p-6 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(74,222,128,0.15)] bg-surface border border-border/30">
            <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
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

          <div className="text-right px-1">
            <Link 
              to="/forgot-password" 
              className="text-xs font-bold text-accent hover:text-accent/80 transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <div className="pt-2">
            <Button type="submit" fullWidth>
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

      {showWebAuthnPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface border border-border rounded-[32px] p-6 max-w-sm w-full space-y-5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent mx-auto animate-pulse">
              <Fingerprint size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-primary">Activer la connexion biométrique ? ⚡</h3>
              <p className="text-xs text-secondary leading-relaxed">
                Associez votre empreinte digitale ou reconnaissance faciale pour vous connecter en un clic la prochaine fois sur cet appareil.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={handleDismissPrompt}
                className="bg-surface-2 border border-border/40 py-3 rounded-xl text-xs font-bold text-secondary active:scale-95 transition-all"
              >
                Plus tard
              </button>
              <button 
                onClick={handleRegisterBiometrics}
                className="bg-accent text-white py-3 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-accent/20"
              >
                Activer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
