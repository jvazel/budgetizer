import React from 'react';
import { Home, Banknote, Plus, BarChart2, Calendar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../../utils/hapticHelper';

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
        {/* Active pill indicator */}
        {isActive && (
          <div className="absolute inset-x-0.5 inset-y-1 rounded-xl bg-accent/10 -z-10 transition-all duration-300" />
        )}
        <Icon
          size={20}
          className={`transition-all duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`}
        />
        <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-surface/90 backdrop-blur-lg border-t border-border/80 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-between items-center h-full px-6 max-w-md mx-auto relative">

        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        {/* Center Plus Button */}
        <div className="relative flex justify-center w-16">
          <button
            onClick={handlePlusClick}
            className="absolute -top-7 w-[56px] h-[56px] bg-gradient-to-b from-[#10b981] to-[#059669] border border-white/10 rounded-full flex items-center justify-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_8px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105 active:scale-90"
          >
            <Plus size={26} />
          </button>
        </div>

        {renderTab(tabs[2])}
        {renderTab(tabs[3])}

      </div>
    </div>
  );
};

export default BottomTabBar;
