import React from 'react';
import { X, FolderTree, Repeat, CreditCard, LogOut, Settings, BarChart2, CalendarDays } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MenuSheet = ({ isOpen, onClose, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { 
      label: 'Tableau de bord', 
      icon: CalendarDays, 
      color: 'text-accent bg-accent/10',
      path: '/'
    },
    { 
      label: 'Gérer les catégories', 
      icon: FolderTree, 
      color: 'text-purple-400 bg-purple-500/10',
      path: '/categories'
    },
    { 
      label: 'Gérer les budgets', 
      icon: CreditCard, 
      color: 'text-pink-400 bg-pink-500/10',
      path: '/budgets'
    },
    { 
      label: 'Transactions planifiées', 
      icon: Repeat, 
      color: 'text-blue-400 bg-blue-500/10',
      path: '/scheduled'
    },
    { 
      label: 'Mes abonnements', 
      icon: CreditCard, 
      color: 'text-amber-400 bg-amber-500/10',
      path: '/subscriptions'
    },
    { 
      label: 'Analyses & Graphiques', 
      icon: BarChart2, 
      color: 'text-indigo-400 bg-indigo-500/10',
      path: '/charts'
    },
    { 
      label: 'Mon Profil & Paramètres', 
      icon: Settings, 
      color: 'text-secondary bg-surface-2',
      path: '/settings'
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-start">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="bg-surface border-r border-border/40 w-full max-w-[280px] h-full shadow-2xl z-10 flex flex-col p-6 relative pointer-events-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-border/40 mb-6">
              <div className="flex items-center gap-2.5">
                <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-7 h-7 rounded-lg object-contain shrink-0" />
                <span className="font-bold text-primary font-mono tracking-tight text-md">Budgetizer</span>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-full hover:bg-border/20 text-secondary hover:text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu List */}
            <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-xl border flex items-center gap-3.5 transition-all text-left font-bold text-xs ${
                      isActive 
                        ? 'bg-accent/15 border-accent/30 text-accent' 
                        : 'bg-surface-2/40 border-border/10 text-primary hover:bg-surface-2/80'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-accent/20 text-accent' : item.color}`}>
                      <Icon size={16} />
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Logout Option */}
            <div className="pt-4 border-t border-border/40 mt-6">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-3.5 hover:bg-danger/20 transition-all text-left font-bold text-danger text-xs active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-danger/20 text-danger shrink-0">
                  <LogOut size={16} />
                </div>
                <span>Se déconnecter</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MenuSheet;
