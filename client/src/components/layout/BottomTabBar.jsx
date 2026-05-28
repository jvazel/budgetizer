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
    <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-surface-2 border-t border-border z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-between items-center h-full px-6 max-w-md mx-auto relative">
        
        {/* Tab 1 */}
        {(() => {
          const Icon1 = tabs[0].icon;
          return (
            <button onClick={() => navigate(tabs[0].path)} className="flex flex-col items-center justify-center w-12">
              <Icon1 
                size={24} 
                className={`transition-all ${location.pathname === tabs[0].path ? 'text-accent scale-110' : 'text-muted'}`} 
              />
            </button>
          );
        })()}

        {/* Tab 2 */}
        {(() => {
          const Icon2 = tabs[1].icon;
          return (
            <button onClick={() => navigate(tabs[1].path)} className="flex flex-col items-center justify-center w-12">
              <Icon2 
                size={24} 
                className={`transition-all ${location.pathname === tabs[1].path ? 'text-accent scale-110' : 'text-muted'}`} 
              />
            </button>
          );
        })()}

        {/* Center Plus Button */}
        <div className="relative flex justify-center w-16">
          <button 
            onClick={onPlusClick}
            className="absolute -top-7 w-[56px] h-[56px] bg-accent rounded-full flex items-center justify-center text-white shadow-[0_8px_16px_rgba(74,222,128,0.3)] transition-transform hover:scale-105 active:scale-95"
          >
            <Plus size={28} />
          </button>
        </div>

        {/* Tab 3 */}
        {(() => {
          const Icon3 = tabs[2].icon;
          return (
            <button onClick={() => navigate(tabs[2].path)} className="flex flex-col items-center justify-center w-12">
              <Icon3 
                size={24} 
                className={`transition-all ${location.pathname === tabs[2].path ? 'text-accent scale-110' : 'text-muted'}`} 
              />
            </button>
          );
        })()}

        {/* Tab 4 */}
        {(() => {
          const Icon4 = tabs[3].icon;
          return (
            <button onClick={() => navigate(tabs[3].path)} className="flex flex-col items-center justify-center w-12">
              <Icon4 
                size={24} 
                className={`transition-all ${location.pathname === tabs[3].path ? 'text-accent scale-110' : 'text-muted'}`} 
              />
            </button>
          );
        })()}

      </div>
    </div>
  );
};

export default BottomTabBar;
