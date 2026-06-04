import React, { useState, useContext, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, Shield, Eye, Settings, FileText, Download, Upload, Trash2, 
  X, AlertTriangle, ArrowLeft, Check, AlertCircle, FileSpreadsheet,
  Smartphone, CheckCircle, Share, Plus, Bell, Fingerprint
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePwa } from '../context/PwaContext';

const SettingsPage = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const { 
    isInstallable, 
    isStandalone, 
    isIOS, 
    installApp,
    pushPermission,
    isPushSubscribed,
    isPushLoading,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    sendTestPush
  } = usePwa();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Forms states
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Preference states
  const [currencyCode, setCurrencyCode] = useState(user?.currency?.code || 'EUR');
  const [currencySymbol, setCurrencySymbol] = useState(user?.currency?.symbol || '€');
  const [theme, setTheme] = useState(user?.preferences?.theme || 'dark');
  const [dateFormat, setDateFormat] = useState(user?.preferences?.dateFormat || 'DD/MM/YYYY');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(user?.preferences?.firstDayOfWeek !== undefined ? user.preferences.firstDayOfWeek : 1);
  const [anomalyThreshold, setAnomalyThreshold] = useState(user?.preferences?.anomalyThreshold || 30);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(user?.preferences?.lowBalanceThreshold !== undefined ? user.preferences.lowBalanceThreshold : 100);
  const [enableBudgetAlerts, setEnableBudgetAlerts] = useState(user?.preferences?.enableBudgetAlerts !== undefined ? user.preferences.enableBudgetAlerts : true);
  const [enableScheduledAlerts, setEnableScheduledAlerts] = useState(user?.preferences?.enableScheduledAlerts !== undefined ? user.preferences.enableScheduledAlerts : true);
  const [enableSavingsAlerts, setEnableSavingsAlerts] = useState(user?.preferences?.enableSavingsAlerts !== undefined ? user.preferences.enableSavingsAlerts : true);
  const [enableLowBalanceAlerts, setEnableLowBalanceAlerts] = useState(user?.preferences?.enableLowBalanceAlerts !== undefined ? user.preferences.enableLowBalanceAlerts : true);
  const [enableAiInsightsAlerts, setEnableAiInsightsAlerts] = useState(user?.preferences?.enableAiInsightsAlerts !== undefined ? user.preferences.enableAiInsightsAlerts : true);

  // CSV Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Modal conformations
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'U';

  const isWebAuthnSupported = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
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

  const handleRegisterCredential = async (e) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      toast.error('Veuillez entrer un nom pour cet appareil.');
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

      toast.loading("Veuillez authentifier votre appareil (empreinte, visage ou PIN)...");
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

      toast.success('Périphérique biométrique enregistré avec succès !');
      setDeviceName('');
      fetchCredentials();
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Échec de l'enregistrement de l'appareil.");
    }
  };

  const handleDeleteCredential = async (id) => {
    try {
      toast.loading("Suppression du périphérique...");
      await api.delete(`/webauthn/credentials/${id}`);
      toast.dismiss();
      toast.success('Périphérique supprimé');
      fetchCredentials();
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Échec de la suppression.");
    }
  };

  // 1. Update Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/users/profile', { name: profileName, email: profileEmail });
      setUser(res.data);
      toast.success('Profil mis à jour avec succès');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    }
  };

  // 2. Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put('/users/password', { oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      toast.success('Mot de passe mis à jour avec succès');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mot de passe incorrect');
    }
  };

  // 3. Update Preferences
  const handleSavePreferences = async (prefUpdates = {}) => {
    try {
      const payload = {
        currency: {
          code: prefUpdates.currencyCode || currencyCode,
          symbol: prefUpdates.currencySymbol || currencySymbol
        },
        theme: prefUpdates.theme || theme,
        dateFormat: prefUpdates.dateFormat || dateFormat,
        firstDayOfWeek: prefUpdates.firstDayOfWeek !== undefined ? prefUpdates.firstDayOfWeek : firstDayOfWeek,
        anomalyThreshold: prefUpdates.anomalyThreshold !== undefined ? prefUpdates.anomalyThreshold : anomalyThreshold,
        lowBalanceThreshold: prefUpdates.lowBalanceThreshold !== undefined ? prefUpdates.lowBalanceThreshold : lowBalanceThreshold,
        enableBudgetAlerts: prefUpdates.enableBudgetAlerts !== undefined ? prefUpdates.enableBudgetAlerts : enableBudgetAlerts,
        enableScheduledAlerts: prefUpdates.enableScheduledAlerts !== undefined ? prefUpdates.enableScheduledAlerts : enableScheduledAlerts,
        enableSavingsAlerts: prefUpdates.enableSavingsAlerts !== undefined ? prefUpdates.enableSavingsAlerts : enableSavingsAlerts,
        enableLowBalanceAlerts: prefUpdates.enableLowBalanceAlerts !== undefined ? prefUpdates.enableLowBalanceAlerts : enableLowBalanceAlerts,
        enableAiInsightsAlerts: prefUpdates.enableAiInsightsAlerts !== undefined ? prefUpdates.enableAiInsightsAlerts : enableAiInsightsAlerts
      };

      const res = await api.put('/users/preferences', payload);
      setUser(res.data);
      toast.success('Préférences enregistrées');
    } catch (err) {
      toast.error('Erreur de sauvegarde des préférences');
    }
  };

  const handleCurrencyChange = (e) => {
    const code = e.target.value;
    let symbol = '€';
    if (code === 'USD') symbol = '$';
    else if (code === 'GBP') symbol = '£';
    else if (code === 'CHF') symbol = 'CHF';
    else if (code === 'JPY') symbol = '¥';

    setCurrencyCode(code);
    setCurrencySymbol(symbol);
    handleSavePreferences({ currencyCode: code, currencySymbol: symbol });
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    handleSavePreferences({ theme: newTheme });
  };

  // 4. Export CSV
  const handleExportCSV = async () => {
    try {
      toast.loading('Génération de l\'export...');
      const res = await api.get('/transactions/export', { responseType: 'blob' });
      toast.dismiss();

      // Download trigger
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Fichier CSV téléchargé');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de l\'exportation');
    }
  };

  // 5. CSV Selection & Preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);

    // Read preview lines
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').slice(0, 6).map(l => l.trim()).filter(Boolean);
      const rows = lines.map(line => {
        // Simple splitter
        let insideQuote = false;
        let entry = '';
        const result = [];
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') insideQuote = !insideQuote;
          else if ((char === ',' || char === ';') && !insideQuote) {
            result.push(entry.replace(/^"|"$/g, ''));
            entry = '';
          } else {
            entry += char;
          }
        }
        result.push(entry.replace(/^"|"$/g, ''));
        return result;
      });
      setImportPreview(rows);
    };
    reader.readAsText(file);
  };

  // 6. CSV Upload Trigger
  const handleImportSubmit = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await api.post('/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportResult(res.data);
      toast.success('Importation finalisée !');
      setImportFile(null);
      setImportPreview([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'importation');
    } finally {
      setImporting(false);
    }
  };

  // 7. Clear Data Wiping
  const handleClearAllData = async () => {
    try {
      await api.delete('/users/clear');
      toast.success('Toutes vos données financières ont été effacées');
      setShowClearConfirm(false);
      window.location.reload();
    } catch (err) {
      toast.error('Erreur lors de l\'effacement');
    }
  };

  // 8. Delete My Account Wiping
  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/me');
      toast.success('Votre compte et toutes vos données ont été définitivement supprimés.');
      logout();
    } catch (err) {
      toast.error('Erreur de suppression du compte');
    }
  };

  const handlePwaInstall = async () => {
    if (isInstallable) {
      const installed = await installApp();
      if (installed) {
        toast.success("Installation de l'application démarrée !");
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };


  return (
    <AppShell title="Paramètres" backTo="/">
      <div className="space-y-8 pb-24">
        
        {/* Profile Card Summary */}
        <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-lg text-accent shadow-inner">
            {initials}
          </div>
          <div>
            <h2 className="text-base font-extrabold text-primary">{user?.name}</h2>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>
        </div>

        {/* 1. Profile Modification Form */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
            <User size={14} className="text-accent" /> Mon Profil
          </h3>
          
          <form onSubmit={handleUpdateProfile} className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">Nom d'affichage</label>
              <input 
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-surface border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">Adresse Email</label>
              <input 
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full bg-surface border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-surface border border-border/40 py-3 rounded-2xl text-xs font-bold text-primary hover:bg-border/20 active:scale-98 transition-all"
            >
              Enregistrer le profil
            </button>
          </form>
        </div>

        {/* 2. Security Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Shield size={14} className="text-accent" /> Sécurité
          </h3>
          
          <form onSubmit={handleUpdatePassword} className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">Ancien mot de passe</label>
              <input 
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-surface border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">Nouveau mot de passe</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-surface border border-border/40 py-3 rounded-2xl text-xs font-bold text-primary hover:bg-border/20 active:scale-98 transition-all"
            >
              Mettre à jour le mot de passe
            </button>
          </form>
        </div>

        {/* Biométrie Section */}
        {isWebAuthnSupported && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Fingerprint size={14} className="text-accent" /> Connexion Biométrique (Passkeys)
            </h3>
            
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-primary">Enregistrer un nouvel appareil</h4>
                <p className="text-[10px] text-muted font-medium">
                  Associez cet appareil (empreinte digitale, Face ID, Hello) à votre compte pour vous connecter sans mot de passe.
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
        )}

        {/* 3. Global Preferences */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Settings size={14} className="text-accent" /> Préférences de l'application
          </h3>

          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-5">
            {/* Currency picker */}
            <div className="flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-primary">Devise par défaut</h4>
                <p className="text-[10px] text-muted">Devise utilisée pour vos budgets et affichages.</p>
              </div>
              <select
                value={currencyCode}
                onChange={handleCurrencyChange}
                className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
              >
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar US ($)</option>
                <option value="GBP">Livre Sterling (£)</option>
                <option value="CHF">Franc Suisse (CHF)</option>
                <option value="JPY">Yen (¥)</option>
              </select>
            </div>

            <hr className="border-border/30" />

            {/* Date format picker */}
            <div className="flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-primary">Format de date</h4>
                <p className="text-[10px] text-muted">Affichage des dates dans vos tableaux.</p>
              </div>
              <select
                value={dateFormat}
                onChange={(e) => {
                  setDateFormat(e.target.value);
                  handleSavePreferences({ dateFormat: e.target.value });
                }}
                className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
              >
                <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
                <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
              </select>
            </div>

            <hr className="border-border/30" />

            {/* Week start day */}
            <div className="flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-primary">Premier jour de la semaine</h4>
                <p className="text-[10px] text-muted">Détermine le jour d'en-tête de vos calendriers.</p>
              </div>
              <select
                value={firstDayOfWeek}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFirstDayOfWeek(val);
                  handleSavePreferences({ firstDayOfWeek: val });
                }}
                className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
              >
                <option value={1}>Lundi</option>
                <option value={0}>Dimanche</option>
              </select>
            </div>

            <hr className="border-border/30" />

            {/* AI Anomaly Sensitivity */}
            <div className="flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-primary">Sensibilité d'anomalie (IA)</h4>
                <p className="text-[10px] text-muted">Seuil de dépassement par défaut pour vos alertes.</p>
              </div>
              <select
                value={anomalyThreshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAnomalyThreshold(val);
                  handleSavePreferences({ anomalyThreshold: val });
                }}
                className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
              >
                <option value={30}>+30% (Sensible)</option>
                <option value={40}>+40%</option>
                <option value={50}>+50%</option>
                <option value={60}>+60% (Modéré)</option>
              </select>
            </div>

            <hr className="border-border/30" />

            {/* Notifications settings */}
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-extrabold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Bell size={14} /> Alertes & Notifications
              </h4>
              
              <div className="space-y-3 pl-1">
                {/* Low Balance Threshold */}
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-primary font-medium">Seuil de solde bas</span>
                    <p className="text-[9px] text-muted font-normal mt-0.5">Seuil en dessous duquel une alerte de solde est générée.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface border border-border/40 rounded-xl px-2.5 py-1.5">
                    <input
                      type="number"
                      value={lowBalanceThreshold}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setLowBalanceThreshold(val);
                      }}
                      onBlur={() => handleSavePreferences({ lowBalanceThreshold })}
                      className="bg-transparent text-xs font-bold text-primary w-14 text-right focus:outline-none"
                    />
                    <span className="text-[10px] text-muted font-bold">{currencySymbol}</span>
                  </div>
                </div>

                <hr className="border-border/20" />

                {/* Enable Budget Alerts */}
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-primary font-medium">Alertes Budgets</span>
                    <p className="text-[9px] text-muted font-normal mt-0.5">Alerte lorsque les budgets mensuels sont presque épuisés.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableBudgetAlerts} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableBudgetAlerts(val);
                        handleSavePreferences({ enableBudgetAlerts: val });
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <hr className="border-border/20" />

                {/* Enable Scheduled Alerts */}
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-primary font-medium">Transactions Planifiées</span>
                    <p className="text-[9px] text-muted font-normal mt-0.5">Notifications pour les prélèvements et abonnements à venir.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableScheduledAlerts} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableScheduledAlerts(val);
                        handleSavePreferences({ enableScheduledAlerts: val });
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <hr className="border-border/20" />

                {/* Enable Savings Alerts */}
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-primary font-medium">Objectifs d'Épargne</span>
                    <p className="text-[9px] text-muted font-normal mt-0.5">Suivi et félicitations pour vos objectifs d'épargne.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableSavingsAlerts} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableSavingsAlerts(val);
                        handleSavePreferences({ enableSavingsAlerts: val });
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <hr className="border-border/20" />

                {/* Enable Low Balance Alerts */}
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-primary font-medium">Soldes de Comptes</span>
                    <p className="text-[9px] text-muted font-normal mt-0.5">Alertes lorsque vos comptes passent sous le seuil configuré.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableLowBalanceAlerts} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableLowBalanceAlerts(val);
                        handleSavePreferences({ enableLowBalanceAlerts: val });
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <hr className="border-border/20" />

                {/* Enable AI Insights Alerts */}
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-primary font-medium">Analyses & IA Insights</span>
                    <p className="text-[9px] text-muted font-normal mt-0.5">Recommandations intelligentes et alertes de dépenses anormales.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableAiInsightsAlerts} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableAiInsightsAlerts(val);
                        handleSavePreferences({ enableAiInsightsAlerts: val });
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <hr className="border-border/20" />

                {/* PWA Web Push Subscription */}
                <div className="flex flex-col space-y-3 pt-2">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <span className="text-xs text-primary font-bold">Notifications Push sur cet appareil</span>
                      <p className="text-[9px] text-muted font-normal mt-0.5">
                        {pushPermission === 'unsupported' 
                          ? "Non supporté par ce navigateur."
                          : pushPermission === 'denied'
                          ? "Bloqué par les réglages de votre navigateur."
                          : isPushSubscribed
                          ? "Abonné aux notifications sur cet appareil."
                          : "Recevez les alertes en tâche de fond."}
                      </p>
                    </div>
                    {pushPermission !== 'unsupported' && pushPermission !== 'denied' && (
                      <button
                        type="button"
                        disabled={isPushLoading}
                        onClick={async () => {
                          try {
                            if (isPushSubscribed) {
                              await unsubscribeFromPushNotifications();
                              toast.success('Désabonné avec succès');
                            } else {
                              await subscribeToPushNotifications();
                              toast.success('Abonné avec succès !');
                            }
                          } catch (err) {
                            toast.error(err.message || 'Échec de la configuration');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shrink-0 active:scale-95 ${
                          isPushSubscribed
                            ? 'bg-danger/10 border border-danger/25 text-danger'
                            : 'bg-accent text-white shadow-sm'
                        }`}
                      >
                        {isPushLoading ? 'Chargement...' : isPushSubscribed ? 'Désactiver' : 'Activer'}
                      </button>
                    )}
                  </div>
                  
                  {isPushSubscribed && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await sendTestPush();
                          toast.success('Test envoyé ! Vérifiez vos notifications.');
                        } catch (err) {
                          toast.error('Échec de l\'envoi du test');
                        }
                      }}
                      className="w-full bg-surface border border-border/30 hover:bg-border/10 text-muted hover:text-primary py-2 rounded-xl text-[10px] font-bold active:scale-98 transition-all flex items-center justify-center gap-1"
                    >
                      <Bell size={10} /> Tester la notification push
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-border/30" />

            {/* Theme switcher */}
            <div className="flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-primary">Thème de l'interface</h4>
                <p className="text-[10px] text-muted">Basculer le style visuel de l'application.</p>
              </div>
              <div className="flex bg-surface p-1 rounded-xl border border-border/40">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    theme === 'dark' ? 'bg-surface-2 text-primary shadow-sm' : 'text-muted'
                  }`}
                >
                  Sombre
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    theme === 'light' ? 'bg-surface-2 text-primary shadow-sm' : 'text-muted'
                  }`}
                >
                  Clair
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PWA Installation Option */}
        {(isInstallable || isIOS || isStandalone) && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Smartphone size={14} className="text-accent" /> Raccourci d'application
            </h3>

            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-primary">Budgetizer sur votre appareil</h4>
                <p className="text-[10px] text-muted">
                  {isStandalone 
                    ? "L'application est installée sur votre appareil et fonctionne de manière autonome." 
                    : "Installez l'application pour y accéder directement depuis votre écran d'accueil."}
                </p>
              </div>

              {isStandalone ? (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-accent/10 border border-accent/20 text-accent">
                  <CheckCircle size={16} />
                  <span className="text-xs font-bold">Application installée</span>
                </div>
              ) : (
                <button 
                  onClick={handlePwaInstall}
                  className="w-full bg-accent text-white py-3.5 rounded-2xl text-xs font-bold hover:scale-101 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-accent/15"
                >
                  <Download size={14} />
                  {isIOS ? "Installer sur iPhone (Safari)" : "Installer l'application"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Import / Export CSV */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
            <FileText size={14} className="text-accent" /> Portabilité des données
          </h3>

          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-primary">Gestion des transactions</h4>
              <p className="text-[10px] text-muted">Sauvegardez vos données ou importez un extrait de compte bancaire.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setIsImportOpen(true)}
                className="bg-accent/10 border border-accent/20 text-accent p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-accent/15 active:scale-97 transition-all"
              >
                <Upload size={20} />
                <span className="text-xs font-bold">Importer CSV</span>
              </button>
              
              <button 
                onClick={handleExportCSV}
                className="bg-surface border border-border/40 text-primary p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-border/20 active:scale-97 transition-all"
              >
                <Download size={20} />
                <span className="text-xs font-bold">Exporter CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Danger zone */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-danger uppercase tracking-wider px-1 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-danger" /> Zone de danger
          </h3>

          <div className="bg-danger-dim/10 p-5 rounded-[28px] border border-danger/20 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-danger">Actions irréversibles</h4>
              <p className="text-[10px] text-danger/80">Soyez extrêmement prudent avec ces actions.</p>
            </div>

            <div className="space-y-2 pt-2">
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="w-full bg-danger/10 hover:bg-danger/15 text-danger border border-danger/30 py-3 rounded-2xl text-xs font-bold active:scale-98 transition-all"
              >
                Effacer toutes les données
              </button>
              
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-danger text-white py-3 rounded-2xl text-xs font-bold hover:bg-danger/90 active:scale-98 transition-all shadow-md shadow-danger/20"
              >
                Supprimer définitivement mon compte
              </button>
            </div>
          </div>
        </div>

        {/* Log out option */}
        <button 
          onClick={logout}
          className="w-full bg-surface-2 border border-border/40 py-3.5 rounded-2xl text-xs font-bold text-muted hover:text-primary transition-colors text-center"
        >
          Se déconnecter
        </button>

      </div>

      {/* Slide up CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="flex-1" onClick={() => !importing && setIsImportOpen(false)} />
          <div className="bg-surface rounded-t-[32px] max-h-[85vh] overflow-y-auto w-full max-w-md mx-auto p-6 shadow-2xl border-t border-border flex flex-col space-y-4 no-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <div>
                <h3 className="text-sm font-extrabold text-primary">Importer des transactions</h3>
                <p className="text-[10px] text-muted">Format requis : date, description, amount, type, category, account</p>
              </div>
              <button 
                onClick={() => !importing && setIsImportOpen(false)} 
                className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
                disabled={importing}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>

            {/* Dropzone field */}
            <div className="border-2 border-dashed border-border/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent/60 transition-colors relative bg-surface-2/40">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={importing}
              />
              <FileSpreadsheet size={32} className="text-muted mb-2" />
              <p className="text-xs font-bold text-primary">
                {importFile ? importFile.name : 'Sélectionnez un fichier .csv'}
              </p>
              <p className="text-[9px] text-muted mt-1">Glissez-déposez ou cliquez pour parcourir</p>
            </div>

            {/* Preview table */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase text-muted tracking-wider">Aperçu avant importation</h4>
                <div className="overflow-x-auto border border-border/40 rounded-xl max-h-40">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-surface-2 text-secondary font-extrabold border-b border-border/40">
                        {importPreview[0].map((h, i) => (
                          <th key={i} className="p-2 truncate">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(1).map((row, i) => (
                        <tr key={i} className="border-b border-border/20 text-primary">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2 truncate max-w-[80px]">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import report outcome */}
            {importResult && (
              <div className="p-4 rounded-2xl border bg-surface-2 border-border/40 space-y-2">
                <div className="flex items-center gap-2">
                  {importResult.failedCount === 0 ? (
                    <Check className="text-accent" size={16} />
                  ) : (
                    <AlertCircle className="text-warning" size={16} />
                  )}
                  <h4 className="text-xs font-bold text-primary">Bilan de l'importation</h4>
                </div>
                
                <p className="text-[10px] text-secondary">
                  ✓ <strong className="text-accent">{importResult.importedCount}</strong> lignes insérées avec succès.
                  {importResult.failedCount > 0 && (
                    <span> / ⚠️ <strong className="text-danger">{importResult.failedCount}</strong> lignes ignorées.</span>
                  )}
                </p>

                {importResult.errors?.length > 0 && (
                  <div className="max-h-24 overflow-y-auto text-[9px] text-danger/80 space-y-1 bg-danger-dim/5 p-2 rounded-lg border border-danger/10">
                    {importResult.errors.map((err, idx) => (
                      <p key={idx}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submission button */}
            <button
              onClick={handleImportSubmit}
              disabled={!importFile || importing}
              className={`w-full py-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all ${
                importFile && !importing 
                  ? 'bg-accent shadow-accent/20 hover:scale-101 active:scale-98' 
                  : 'bg-border/60 text-muted shadow-none cursor-not-allowed'
              }`}
            >
              {importing ? 'Importation en cours...' : 'Lancer l\'importation'}
            </button>

          </div>
        </div>
      )}

      {/* Confirmation Dialog Clear Data */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface border border-border rounded-[32px] p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <AlertTriangle className="text-danger mx-auto" size={42} />
            <div>
              <h3 className="text-sm font-extrabold text-primary">Effacer toutes les données ?</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Cette action supprimera l'intégralité de vos comptes, transactions, budgets et planifications. Vos identifiants de profil seront conservés.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="bg-surface-2 border border-border/40 py-3 rounded-2xl text-xs font-bold text-primary active:scale-95 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleClearAllData}
                className="bg-danger text-white py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-danger/20"
              >
                Tout effacer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Delete Account */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-surface border border-border rounded-[32px] p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <AlertTriangle className="text-danger mx-auto" size={42} />
            <div>
              <h3 className="text-sm font-extrabold text-primary">Supprimer mon compte ?</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Cette opération est définitive et irréversible. Votre compte d'utilisateur et l'intégralité de vos enregistrements financiers seront effacés en cascade.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-surface-2 border border-border/40 py-3 rounded-2xl text-xs font-bold text-primary active:scale-95 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="bg-danger text-white py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-danger/20"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowIOSModal(false)}>
          <div className="bg-surface border border-border rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-start pb-2 border-b border-border/40">
              <div>
                <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                  <Smartphone className="text-accent" size={18} />
                  Installer sur iPhone
                </h3>
                <p className="text-[10px] text-muted mt-0.5">Suivez ces étapes depuis Safari :</p>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
              >
                <X size={16} className="text-secondary" />
              </button>
            </div>

            {/* Steps List */}
            <div className="space-y-3 py-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-bold text-accent shrink-0">1</div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Appuyez sur le bouton de partage <span className="inline-flex items-center justify-center p-0.5 bg-surface-2 rounded border border-border mx-0.5"><Share size={10} className="text-accent" /></span> dans Safari.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-bold text-accent shrink-0">2</div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Sélectionnez l'option <span className="font-semibold text-primary">"Sur l'écran d'accueil"</span> <span className="inline-flex items-center justify-center p-0.5 bg-surface-2 rounded border border-border mx-0.5"><Plus size={10} className="text-accent" /></span>.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-bold text-accent shrink-0">3</div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Cliquez sur <span className="font-semibold text-accent">"Ajouter"</span> dans le coin supérieur droit.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-surface-2 border border-border py-3 rounded-2xl text-xs font-bold text-primary hover:bg-border/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Check size={14} className="text-accent" />
              J'ai compris
            </button>
          </div>
        </div>
      )}

    </AppShell>
  );
};

export default SettingsPage;
