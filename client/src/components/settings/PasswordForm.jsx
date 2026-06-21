import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PasswordForm = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

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

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
        <Shield size={14} className="text-accent" /> Sécurité
      </h3>
      
      <form onSubmit={handleUpdatePassword} className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Ancien mot de passe <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span></label>
          <input 
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full bg-surface border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Nouveau mot de passe <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span></label>
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
  );
};

export default PasswordForm;
