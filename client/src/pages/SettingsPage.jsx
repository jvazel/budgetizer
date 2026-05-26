import React, { useState, useContext } from 'react';
import AppShell from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, Shield, Eye, Settings, FileText, Download, Upload, Trash2, 
  X, AlertTriangle, ArrowLeft, Check, AlertCircle, FileSpreadsheet,
  Smartphone, CheckCircle, Share, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePwa } from '../context/PwaContext';

const SettingsPage = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const { isInstallable, isStandalone, isIOS, installApp } = usePwa();
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
        firstDayOfWeek: prefUpdates.firstDayOfWeek !== undefined ? prefUpdates.firstDayOfWeek : firstDayOfWeek
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
