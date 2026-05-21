import React from 'react';
import { X, FolderTree, Repeat, CreditCard, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MenuSheet = ({ isOpen, onClose, onLogout }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const menuItems = [
    { 
      label: 'Mon Profil & Paramètres', 
      icon: Settings, 
      color: 'text-amber-400 bg-amber-500/10',
      action: () => { navigate('/settings'); onClose(); }
    },
    { 
      label: 'Gérer les catégories', 
      icon: FolderTree, 
      color: 'text-accent bg-accent/10',
      action: () => { navigate('/categories'); onClose(); }
    },
    { 
      label: 'Gérer les budgets', 
      icon: CreditCard, 
      color: 'text-pink-400 bg-pink-500/10',
      action: () => { navigate('/budgets'); onClose(); }
    },
    { 
      label: 'Transactions planifiées', 
      icon: Repeat, 
      color: 'text-purple-400 bg-purple-500/10',
      action: () => { navigate('/scheduled'); onClose(); }
    },
    { 
      label: 'Mes abonnements', 
      icon: CreditCard, 
      color: 'text-blue-400 bg-blue-500/10',
      action: () => { navigate('/subscriptions'); onClose(); }
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
      {/* Tap outside to close */}
      <div className="flex-1" onClick={onClose} />
      
      <div className="bg-surface rounded-t-[32px] w-full max-w-md mx-auto p-6 shadow-2xl border-t border-border space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <h2 className="text-md font-bold text-primary">Réglages & Options</h2>
          <button onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
            <X size={20} className="text-secondary" />
          </button>
        </div>

        {/* Menu list */}
        <div className="space-y-3">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
                  <Icon size={20} />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout Option */}
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="w-full p-4 rounded-2xl bg-danger/10 border border-danger/20 flex items-center gap-4 hover:bg-danger/20 transition-colors text-left font-bold text-danger"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-danger/20 text-danger">
            <LogOut size={20} />
          </div>
          <span>Se déconnecter</span>
        </button>

      </div>
    </div>
  );
};

export default MenuSheet;
