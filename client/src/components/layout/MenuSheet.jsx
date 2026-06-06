import React from 'react';
import { X, FolderTree, Repeat, CreditCard, LogOut, Settings, BarChart2, CalendarDays, Sparkles, Banknote, Target, Wallet, ArrowLeftRight, FileText, TrendingUp } from 'lucide-react';
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
      label: 'Transactions', 
      icon: Banknote, 
      color: 'text-emerald-400 bg-emerald-500/10',
      path: '/transactions'
    },
    { 
      label: 'Virements instantanés', 
      icon: ArrowLeftRight, 
      color: 'text-teal-400 bg-teal-500/10',
      path: '/transfers'
    },
    { 
      label: 'Comptes', 
      icon: Wallet, 
      color: 'text-sky-400 bg-sky-500/10',
      path: '/accounts'
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
      label: 'Objectifs d\'épargne', 
      icon: Target, 
      color: 'text-rose-400 bg-rose-500/10',
      path: '/savings'
    },
    { 
      label: 'Conseils', 
      icon: Sparkles, 
      color: 'text-yellow-400 bg-yellow-500/10',
      path: '/ai-insights'
    },
    { 
      label: 'Rapport Mensuel', 
      icon: FileText, 
      color: 'text-purple-400 bg-purple-500/10',
      path: '/monthly-report'
    },
    { 
      label: 'Exporter un rapport', 
      icon: FileText, 
      color: 'text-orange-400 bg-orange-500/10',
      path: '/reports'
    },
    { 
      label: 'Scores financiers', 
      icon: TrendingUp, 
      color: 'text-emerald-400 bg-emerald-500/10',
      path: '/financial-scores'
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
            className="bg-surface border-r border-border/40 w-full max-w-[280px] h-full shadow-2xl z-10 flex flex-col p-5 relative overflow-hidden pointer-events-auto"
          >
            {/* Ambient Background Glow Flares */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-purple/5 rounded-full blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-border/20 mb-6 mt-1 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-surface border border-border/30 shadow-[0_0_15px_rgba(74,222,128,0.15)] shrink-0">
                  <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-primary font-sans tracking-tight text-sm">Budgetizer</span>
                  <span className="text-[9px] text-muted font-bold tracking-widest uppercase leading-none mt-0.5">Finances</span>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-full hover:bg-surface-2 text-secondary hover:text-primary transition-all duration-200 active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* Menu List */}
            <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar relative z-10">
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
                    className={`w-full p-3 rounded-2xl flex items-center gap-3.5 transition-all duration-200 text-left font-semibold text-xs relative overflow-hidden group ${
                      isActive 
                        ? 'bg-accent/10 text-accent font-bold shadow-sm' 
                        : 'text-secondary hover:text-primary hover:bg-surface-2/40'
                    }`}
                  >
                    {/* Left active accent indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-3 bottom-3 w-0.75 bg-accent rounded-r" />
                    )}
                    
                    {/* Icon wrapper */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 ${
                      isActive 
                        ? 'bg-accent/20 text-accent' 
                        : 'bg-surface-2 text-secondary group-hover:bg-surface-2/80'
                    }`}>
                      <Icon size={15} />
                    </div>
                    
                    {/* Label */}
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5">{item.label}</span>
                    
                    {/* Micro Chevron pointer on hover */}
                    <span className="ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-accent text-[9px] font-bold">
                      ➔
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Logout Option */}
            <div className="pt-4 border-t border-border/20 mt-6 relative z-10">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full p-3 rounded-2xl bg-danger/5 hover:bg-danger/10 flex items-center gap-3.5 transition-all duration-200 text-left font-semibold text-danger text-xs group active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-danger/15 text-danger shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <LogOut size={15} />
                </div>
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">Se déconnecter</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MenuSheet;
