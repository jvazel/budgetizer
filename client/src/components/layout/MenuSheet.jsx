import React from 'react';
import { X, FolderTree, Tag, Repeat, CreditCard, LogOut, Settings, BarChart2, CalendarDays, Sparkles, Banknote, Target, Wallet, ArrowLeftRight, FileText, TrendingUp, Building2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MenuSheet = ({ isOpen, onClose, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuGroups = [
    {
      title: 'Opérations',
      items: [
        { label: 'Tableau de bord', icon: CalendarDays, path: '/' },
        { label: 'Comptes', icon: Wallet, path: '/accounts' },
        { label: 'Transactions', icon: Banknote, path: '/transactions' },
        { label: 'Virements instantanés', icon: ArrowLeftRight, path: '/transfers' },
      ]
    },
    {
      title: 'Planification',
      items: [
        { label: 'Gérer les budgets', icon: CreditCard, path: '/budgets' },
        { label: 'Planifications & Abonnements', icon: Repeat, path: '/scheduled' },
        { label: 'Objectifs d\'épargne', icon: Target, path: '/savings' },
        { label: 'Simulateur de prêt', icon: Building2, path: '/loan-simulator' },
      ]
    },
    {
      title: 'Analyses & IA',
      items: [
        { label: 'Analyses & Graphiques', icon: BarChart2, path: '/charts' },
        { label: 'Rapport Mensuel', icon: FileText, path: '/monthly-report' },
        { label: 'Scores financiers', icon: TrendingUp, path: '/financial-scores' },
        { label: 'Conseils', icon: Sparkles, path: '/ai-insights' },
        { label: 'Exporter un rapport', icon: FileText, path: '/reports' },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { label: 'Mon Profil & Paramètres', icon: Settings, path: '/settings' },
      ]
    }
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
            <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar relative z-10 pr-1">
              {menuGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-1">
                  <span className="px-3 text-[9px] font-bold text-muted uppercase tracking-widest block mb-1">
                    {group.title}
                  </span>
                  {group.items.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          navigate(item.path);
                          onClose();
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 text-left font-medium text-xs relative overflow-hidden group ${
                          isActive 
                            ? 'bg-accent/8 text-accent font-semibold shadow-sm' 
                            : 'text-secondary hover:text-primary hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Left active accent indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-2.5 bottom-2.5 w-[2px] bg-accent rounded-r" />
                        )}
                        
                        {/* Icon wrapper */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 ${
                          isActive 
                            ? 'bg-accent/15 text-accent' 
                            : 'bg-white/[0.04] text-secondary group-hover:text-primary group-hover:bg-white/[0.08]'
                        }`}>
                          <Icon size={14} />
                        </div>
                        
                        {/* Label */}
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">{item.label}</span>
                        
                        {/* Micro Chevron pointer on hover */}
                        <span className="ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-accent text-[8px] font-bold">
                          ➔
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Logout Option */}
            <div className="pt-4 border-t border-border/20 mt-4 relative z-10">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl bg-danger/5 hover:bg-danger/10 flex items-center gap-3 transition-all duration-200 text-left font-semibold text-danger text-xs group active:scale-98"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-danger/15 text-danger shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <LogOut size={14} />
                </div>
                <span className="group-hover:translate-x-0.5 transition-transform duration-200 font-medium">Se déconnecter</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MenuSheet;
