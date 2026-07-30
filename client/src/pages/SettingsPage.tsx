import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { AlertTriangle, FolderTree, Tag, ChevronRight, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

import ProfileForm from '../components/settings/ProfileForm';
import PasswordForm from '../components/settings/PasswordForm';
import WebAuthnKeys from '../components/settings/WebAuthnKeys';
import PreferencesForm from '../components/settings/PreferencesForm';
import CsvImportForm from '../components/settings/CsvImportForm';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);

  // Modal confirmations
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Clear Data Wiping
  const handleClearAllData = async () => {
    try {
      await api.delete('/users/clear');
      toast.success('Toutes tes données financières ont été effacées');
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
      toast.success('Ton compte et toutes tes données ont été définitivement supprimés.');
      logout();
    } catch (err) {
      toast.error('Erreur de suppression du compte');
    }
  };

  return (
    <>
      <HeaderTitle>Paramètres</HeaderTitle>
      <HeaderBackButton to="/" />
      <div className="space-y-8 mb-6">
        
        {/* Profile Card Summary & Form */}
        <ProfileForm user={user} setUser={setUser} />

        {/* Security & Password */}
        <PasswordForm />

        {/* Passkeys Credentials Management */}
        <WebAuthnKeys />

        {/* Preferences / PWA options */}
        <PreferencesForm user={user} setUser={setUser} />

        {/* Categories & Tags Management */}
        <div className="space-y-4">
          <h3 className="premium-label px-1">
            Structure & Catégorisation
          </h3>
          <div className="space-y-2.5">
            <button 
              onClick={() => navigate('/settings/rules')}
              className="w-full flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-border/40 hover:bg-border/10 transition-all text-left active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">Smart Rules & Catégorisation</h4>
                  <p className="text-[10px] text-muted">Automatisations de catégories et de pointage par règles.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors" />
            </button>

            <button 
              onClick={() => navigate('/categories')}
              className="w-full flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-border/40 hover:bg-border/10 transition-all text-left active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-copper/10 text-copper group-hover:bg-copper group-hover:text-white transition-colors">
                  <FolderTree size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">Catégories</h4>
                  <p className="text-[10px] text-muted">Gère l'organisation et l'arborescence de tes transactions.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors" />
            </button>

            <button 
              onClick={() => navigate('/tags')}
              className="w-full flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-border/40 hover:bg-border/10 transition-all text-left active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Tag size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">Étiquettes (Tags)</h4>
                  <p className="text-[10px] text-muted">Personnalise les tags transversaux pour un suivi plus fin.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors" />
            </button>

            <button 
              onClick={() => navigate('/settings/sharing')}
              className="w-full flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-border/40 hover:bg-border/10 transition-all text-left active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                  <Users size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">Partage & Collaboration</h4>
                  <p className="text-[10px] text-muted">Partage tes comptes et budgets avec tes proches.</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>

        {/* Portability / CSV Import & Export */}
        <CsvImportForm />

        {/* Danger zone */}
        <div className="space-y-4">
          <h3 className="premium-label text-danger px-1 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-danger" /> Zone de danger
          </h3>

          <div className="banky-card border-danger/30 p-5 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-danger">Actions irréversibles</h4>
              <p className="text-[10px] text-danger/80">Sois extrêmement prudent avec ces actions.</p>
            </div>

            <div className="space-y-2 pt-2">
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="w-full bg-danger/10 hover:bg-danger/15 text-danger border border-danger/30 py-3 rounded-xl text-xs font-bold active:scale-98 transition-all"
              >
                Effacer toutes les données
              </button>
              
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-danger text-white py-3 rounded-xl text-xs font-bold hover:bg-danger/90 active:scale-98 transition-all shadow-md shadow-danger/20"
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
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAllData}
        title="Effacer toutes les données ?"
        confirmText="Tout effacer"
        cancelText="Annuler"
        type="danger"
      >
        <p className="text-xs text-secondary leading-relaxed">
          Cette action supprimera l'intégralité de tes comptes, transactions, budgets et planifications. Tes identifiants de profil seront conservés.
        </p>
      </ConfirmModal>

      {/* Confirmation Dialog Delete Account */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Supprimer mon compte ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      >
        <p className="text-xs text-secondary leading-relaxed">
          Cette opération est définitive et irréversible. Ton compte d'utilisateur et l'intégralité de tes enregistrements financiers seront effacés en cascade.
        </p>
      </ConfirmModal>

    </>
  );
};

export default SettingsPage;
