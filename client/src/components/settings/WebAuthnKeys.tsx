import React, { useState, useEffect } from 'react';
import { Fingerprint, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const WebAuthnKeys = () => {
  const isWebAuthnSupported = typeof window !== 'undefined' && 
    window.PublicKeyCredential !== undefined && 
    navigator.credentials !== undefined;

  const [credentials, setCredentials] = useState([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [deviceName, setDeviceName] = useState('');

  const fetchCredentials = async () => {
    if (!isWebAuthnSupported) return;
    try {
      setLoadingCreds(true);
      const res = await api.get('/webauthn/credentials');
      setCredentials(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCreds(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  if (!isWebAuthnSupported) return null;

  const handleRegisterCredential = async (e) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      toast.error('Saisis un nom pour cet appareil.');
      return;
    }
    
    try {
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

      toast.loading("Authentifie ton appareil (empreinte, visage ou PIN)...");
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

      toast.success('Périphérique biométrique enregistré avec succès !');
      localStorage.setItem('webauthn_registered_on_device', 'true');
      localStorage.removeItem('webauthn_dismissed_device');
      setDeviceName('');
      fetchCredentials();
    } catch (err) {
      toast.dismiss();
      console.error(err);
      const isAlreadyRegistered = err && (
        err.name === 'InvalidStateError' || 
        err.message?.toLowerCase().includes('already exists') ||
        err.message?.toLowerCase().includes('credential manager')
      );
      if (isAlreadyRegistered) {
        localStorage.setItem('webauthn_registered_on_device', 'true');
        localStorage.removeItem('webauthn_dismissed_device');
        toast.success("Cet appareil est déjà configuré pour la connexion biométrique !");
        setDeviceName('');
        fetchCredentials();
      } else {
        toast.error(err.response?.data?.message || err.message || "Échec de l'enregistrement de l'appareil.");
      }
    }
  };

  const handleDeleteCredential = async (id) => {
    try {
      toast.loading("Suppression du périphérique...");
      await api.delete(`/webauthn/credentials/${id}`);
      toast.dismiss();
      toast.success('Périphérique supprimé');
      localStorage.removeItem('webauthn_registered_on_device');
      localStorage.removeItem('webauthn_dismissed_device');
      fetchCredentials();
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Échec de la suppression.");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
        <Fingerprint size={14} className="text-accent" /> Connexion Biométrique (Passkeys)
      </h3>
      
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-primary">Enregistrer un nouvel appareil</h4>
          <p className="text-[10px] text-muted font-medium">
            Associe cet appareil (empreinte digitale, Face ID, Hello) à ton compte pour te connecter sans mot de passe.
          </p>
        </div>

        <form onSubmit={handleRegisterCredential} className="flex gap-2">
          <input 
            type="text"
            placeholder="Nom de l'appareil (ex: Mon MacBook)"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="flex-1 bg-surface border border-border/40 px-4 py-2.5 rounded-xl text-xs text-primary focus:outline-none focus:border-accent"
          />
          <button 
            type="submit" 
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} /> Enregistrer
          </button>
        </form>

        {credentials.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-[10px] font-extrabold uppercase text-muted tracking-wider">Appareils enregistrés</h4>
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div key={cred._id} className="flex justify-between items-center bg-surface p-3 rounded-xl border border-border/30">
                  <div>
                    <p className="text-xs font-bold text-primary">{cred.deviceName}</p>
                    <p className="text-[9px] text-muted">
                      Enregistré le {new Date(cred.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCredential(cred._id)}
                    className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    title="Supprimer cet appareil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebAuthnKeys;
