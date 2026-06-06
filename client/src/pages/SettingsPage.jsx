import React, { useState, useContext } from 'react';
import AppShell from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

import ProfileForm from '../components/settings/ProfileForm';
import PasswordForm from '../components/settings/PasswordForm';
import WebAuthnKeys from '../components/settings/WebAuthnKeys';
import PreferencesForm from '../components/settings/PreferencesForm';
import CsvImportForm from '../components/settings/CsvImportForm';

const SettingsPage = () => {
  const { user, setUser, logout } = useContext(AuthContext);

  // Modal confirmations
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Clear Data Wiping
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

  // Delete My Account Wiping
  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/me');
      toast.success('Votre compte et toutes vos données ont été définitivement supprimés.');
      logout();
    } catch (err) {
      toast.error('Erreur de suppression du compte');
    }
  };

  return (
    <AppShell title="Paramètres" backTo="/">
      <div className="space-y-8 pb-24">
        
        {/* Profile Card Summary & Form */}
        <ProfileForm user={user} setUser={setUser} />

        {/* Security & Password */}
        <PasswordForm />

        {/* Passkeys Credentials Management */}
        <WebAuthnKeys />

        {/* Preferences / PWA options */}
        <PreferencesForm user={user} setUser={setUser} />

        {/* Portability / CSV Import & Export */}
        <CsvImportForm />

        {/* Danger zone */}
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

    </AppShell>
  );
};

export default SettingsPage;
