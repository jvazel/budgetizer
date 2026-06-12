import React from 'react';
import { Home, Banknote, Plus, BarChart2, Calendar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

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

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-surface/90 backdrop-blur-lg border-t border-border/80 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-between items-center h-full px-6 max-w-md mx-auto relative">
        
        {/* Tab 1 */}
        {(() => {
          const Icon1 = tabs[0].icon;
          return (
            <button 
              onClick={() => navigate(tabs[0].path)} 
              className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-white/[0.04] active:scale-90 transition-all select-none"
            >
              <Icon1 
                size={22} 
                className={`transition-all duration-300 ${location.pathname === tabs[0].path ? 'text-accent scale-105' : 'text-secondary/70'}`} 
              />
            </button>
          );
        })()}

        {/* Tab 2 */}
        {(() => {
          const Icon2 = tabs[1].icon;
          return (
            <button 
              onClick={() => navigate(tabs[1].path)} 
              className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-white/[0.04] active:scale-90 transition-all select-none"
            >
              <Icon2 
                size={22} 
                className={`transition-all duration-300 ${location.pathname === tabs[1].path ? 'text-accent scale-105' : 'text-secondary/70'}`} 
              />
            </button>
          );
        })()}

        {/* Center Plus Button */}
        <div className="relative flex justify-center w-16">
          <button 
            onClick={onPlusClick}
            className="absolute -top-7 w-[56px] h-[56px] bg-gradient-to-b from-[#10b981] to-[#059669] border border-white/10 rounded-full flex items-center justify-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_8px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105 active:scale-90"
          >
            <Plus size={26} />
          </button>
        </div>

        {/* Tab 3 */}
        {(() => {
          const Icon3 = tabs[2].icon;
          return (
            <button 
              onClick={() => navigate(tabs[2].path)} 
              className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-white/[0.04] active:scale-90 transition-all select-none"
            >
              <Icon3 
                size={22} 
                className={`transition-all duration-300 ${location.pathname === tabs[2].path ? 'text-accent scale-105' : 'text-secondary/70'}`} 
              />
            </button>
          );
        })()}

        {/* Tab 4 */}
        {(() => {
          const Icon4 = tabs[3].icon;
          return (
            <button 
              onClick={() => navigate(tabs[3].path)} 
              className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-white/[0.04] active:scale-90 transition-all select-none"
            >
              <Icon4 
                size={22} 
                className={`transition-all duration-300 ${location.pathname === tabs[3].path ? 'text-accent scale-105' : 'text-secondary/70'}`} 
              />
            </button>
          );
        })()}

      </div>
    </div>
  );
};

export default BottomTabBar;
