import React, { useState } from 'react';
import { User } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ProfileForm = ({ user, setUser }) => {
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'U';

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

  return (
    <div className="space-y-6">
      {/* Profil Header */}
      <div className="flex items-center gap-3.5 bg-surface-2 p-5 rounded-[28px] border border-border/40">
        <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-lg text-accent shadow-inner">
          {initials}
        </div>
        <div>
          <h2 className="text-base font-extrabold text-primary">{user?.name}</h2>
          <p className="text-xs text-muted">{user?.email}</p>
        </div>
      </div>

      {/* Profile Modification Form */}
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
    </div>
  );
};

export default ProfileForm;
