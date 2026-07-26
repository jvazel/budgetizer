import React, { useState, useEffect, useContext } from 'react';
import { Fingerprint, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

const WebAuthnPromptModal = () => {
  const { user } = useContext(AuthContext);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Only check if user is logged in
    if (!user) {
      setShowPrompt(false);
      return;
    }

    const isJustLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
    const isWebAuthnSupported = typeof window !== 'undefined' && 
      window.PublicKeyCredential !== undefined && 
      navigator.credentials !== undefined;
    const isRegistered = localStorage.getItem('webauthn_registered_on_device') === 'true';
    const isDismissed = localStorage.getItem('webauthn_dismissed_device') === 'true';

    if (isJustLoggedIn && isWebAuthnSupported && !isRegistered && !isDismissed) {
      setShowPrompt(true);
      // Consume the flag immediately so it doesn't pop up again on route changes or refreshes
      sessionStorage.removeItem('just_logged_in');
    }
  }, [user]);

  const handleDismissPrompt = () => {
    localStorage.setItem('webauthn_dismissed_device', 'true');
    setShowPrompt(false);
  };

  const handleCloseOnly = () => {
    // Just close for this session, don't set dismissed in localStorage
    setShowPrompt(false);
  };

  const handleRegisterBiometrics = async () => {
    setIsRegistering(true);
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
      options.user.id = base64urlToArrayBuffer(options.user.id);
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials
          .map(cred => ({
            ...cred,
            id: base64urlToArrayBuffer(cred.id)
          }))
          .filter(cred => cred.id.byteLength > 0);
      }

      toast.loading("Veuillez authentifier votre appareil...");
      const credential = await navigator.credentials.create({ publicKey: options });
      toast.dismiss();

      if (!credential) {
        throw new Error("L'enregistrement a été annulé ou n'a pas pu être complété.");
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
      setShowPrompt(false);
    } catch (err) {
      toast.dismiss();
      console.error(err);
      const isAlreadyRegistered = err && (
        err.name === 'InvalidStateError' || 
        err.message?.toLowerCase().includes('already exists') ||
        err.message?.toLowerCase().includes('credential manager')
      );
      if (isAlreadyRegistered) {
        // The credential manager has this key already registered and matches excludeCredentials,
        // or there is a Play Services wrapper error indicating it is already registered.
        // Therefore, the device is already biometrically registered and fully functional.
        localStorage.setItem('webauthn_registered_on_device', 'true');
        localStorage.removeItem('webauthn_dismissed_device');
        toast.success("Votre appareil est déjà configuré pour la connexion biométrique !");
      } else {
        toast.error(err.response?.data?.message || err.message || "Échec de l'activation.");
      }
      setShowPrompt(false);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseOnly}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[9999] pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-surface border border-border rounded-[32px] p-6 max-w-sm w-full space-y-5 text-center shadow-2xl pointer-events-auto relative overflow-hidden"
            >
              {/* Close Icon (X) */}
              <button
                onClick={handleCloseOnly}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-surface-2 text-secondary hover:text-primary transition-colors border border-border/20"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>

              {/* Icon Glow */}
              <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent mx-auto animate-pulse">
                <Fingerprint size={32} />
              </div>
              
              {/* Text */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-primary">Activer la connexion biométrique ? ⚡</h3>
                <p className="text-xs text-secondary leading-relaxed px-2">
                  Associez votre empreinte digitale ou reconnaissance faciale pour vous connecter en un clic la prochaine fois sur cet appareil.
                </p>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={handleDismissPrompt}
                  disabled={isRegistering}
                  className="bg-surface-2 border border-border/40 py-3 rounded-xl text-xs font-bold text-secondary active:scale-95 disabled:opacity-50 transition-all"
                >
                  Plus tard
                </button>
                <button 
                  onClick={handleRegisterBiometrics}
                  disabled={isRegistering}
                  className="bg-accent text-white py-3 rounded-xl text-xs font-bold active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-accent/20"
                >
                  Activer
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WebAuthnPromptModal;
