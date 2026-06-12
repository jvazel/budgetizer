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

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-surface/90 backdrop-blur-lg border-t border-border/80 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-between items-center h-full px-6 max-w-md mx-auto relative">
        
        {/* Tab 1 */}
        {(() => {
          const Icon1 = tabs[0].icon;
          const isActive = location.pathname === tabs[0].path;
          return (
            <button 
              onClick={() => handleTabClick(tabs[0].path)} 
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all select-none gap-0.5"
            >
              <Icon1 
                size={20} 
                className={`transition-all duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`} 
              />
              <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`}>
                {tabs[0].label}
              </span>
            </button>
          );
        })()}

        {/* Tab 2 */}
        {(() => {
          const Icon2 = tabs[1].icon;
          const isActive = location.pathname === tabs[1].path;
          return (
            <button 
              onClick={() => handleTabClick(tabs[1].path)} 
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all select-none gap-0.5"
            >
              <Icon2 
                size={20} 
                className={`transition-all duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`} 
              />
              <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`}>
                {tabs[1].label}
              </span>
            </button>
          );
        })()}

        {/* Center Plus Button */}
        <div className="relative flex justify-center w-16">
          <button 
            onClick={handlePlusClick}
            className="absolute -top-7 w-[56px] h-[56px] bg-gradient-to-b from-[#10b981] to-[#059669] border border-white/10 rounded-full flex items-center justify-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_8px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105 active:scale-90"
          >
            <Plus size={26} />
          </button>
        </div>

        {/* Tab 3 */}
        {(() => {
          const Icon3 = tabs[2].icon;
          const isActive = location.pathname === tabs[2].path;
          return (
            <button 
              onClick={() => handleTabClick(tabs[2].path)} 
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all select-none gap-0.5"
            >
              <Icon3 
                size={20} 
                className={`transition-all duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`} 
              />
              <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`}>
                {tabs[2].label}
              </span>
            </button>
          );
        })()}

        {/* Tab 4 */}
        {(() => {
          const Icon4 = tabs[3].icon;
          const isActive = location.pathname === tabs[3].path;
          return (
            <button 
              onClick={() => handleTabClick(tabs[3].path)} 
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all select-none gap-0.5"
            >
              <Icon4 
                size={20} 
                className={`transition-all duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`} 
              />
              <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-accent' : 'text-secondary/70'}`}>
                {tabs[3].label}
              </span>
            </button>
          );
        })()}

      </div>
    </div>
  );
};

export default BottomTabBar;
