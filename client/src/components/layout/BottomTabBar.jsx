import React from 'react';
import { Home, Banknote, Plus, BarChart2, Calendar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../../utils/hapticHelper';
import { motion } from 'framer-motion';

const BottomTabBar = ({ onPlusClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/transactions', icon: Banknote, label: 'Transactions' },
    // Plus button is handled separately
    { path: '/charts', icon: BarChart2, label: 'Analyses' },
    { path: '/calendar', icon: Calendar, label: 'Calendrier' },
  ];

  const handleTabClick = (path) => {
    triggerHaptic('light');
    navigate(path);
  };

  const handlePlusClick = () => {
    triggerHaptic('medium');
    onPlusClick();
  };

  const renderTab = (tab) => {
    const Icon = tab.icon;
    const isActive = location.pathname === tab.path;
    return (
      <button
        key={tab.path}
        onClick={() => handleTabClick(tab.path)}
        className="flex flex-col items-center justify-center w-14 h-14 rounded-xl active:scale-90 transition-all select-none gap-0.5 relative"
      >
        {/* Active pill indicator with spring layout animation */}
        {isActive && (
          <motion.div
            layoutId="activeTabPill"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="absolute inset-x-0.5 inset-y-1 rounded-xl bg-copper-dim -z-10"
          />
        )}
        <Icon
          size={20}
          className={`transition-all duration-300 ${isActive ? 'text-copper' : 'text-secondary/70'}`}
        />
        <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-copper' : 'text-secondary/70'}`}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-[calc(72px+env(safe-area-inset-bottom,0px))] bg-surface-glass backdrop-blur-lg border-t border-border/40 z-40 pb-[env(safe-area-inset-bottom,0px)] will-change-transform"
      style={{ transform: 'translate3d(0, 0, 0)' }}
    >
      <div className="flex justify-between items-center h-full px-6 max-w-md mx-auto relative">

        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        {/* Center Plus Button with refined copper style and subtle glow */}
        <div className="relative flex justify-center w-16">
          <button
            onClick={handlePlusClick}
            className="absolute -top-7 w-[52px] h-[52px] bg-copper border border-white/10 rounded-full flex items-center justify-center text-white shadow-[0_6px_20px_rgba(217,119,6,0.25)] transition-all duration-300 hover:scale-105 active:scale-90"
          >
            <Plus size={24} />
          </button>
        </div>

        {renderTab(tabs[2])}
        {renderTab(tabs[3])}

      </div>
    </div>
  );
};

export default BottomTabBar;
