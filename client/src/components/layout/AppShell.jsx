import React, { useState, useContext, createContext } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import BottomTabBar from './BottomTabBar';
import TransactionFormSheet from '../transactions/TransactionFormSheet';
import MenuSheet from './MenuSheet';
import { AuthContext } from '../../context/AuthContext';

export const HeaderPortalContext = createContext({
  titleTarget: null,
  actionsTarget: null,
  backTarget: null,
  openMenu: () => {},
});

export const HeaderTitle = ({ children }) => {
  const { titleTarget } = useContext(HeaderPortalContext);
  if (!titleTarget) return null;
  return createPortal(children, titleTarget);
};

export const HeaderActions = ({ children }) => {
  const { actionsTarget } = useContext(HeaderPortalContext);
  if (!actionsTarget) return null;
  return createPortal(children, actionsTarget);
};

export const HeaderBackButton = ({ to, onClick }) => {
  const { backTarget } = useContext(HeaderPortalContext);
  const navigate = useNavigate();
  if (!backTarget) return null;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (to) {
      navigate(to);
    }
  };

  return createPortal(
    <button 
      onClick={handleClick} 
      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/[0.06] text-secondary hover:text-primary transition-colors shrink-0 -ml-2.5"
    >
      <ChevronLeft size={22} />
    </button>,
    backTarget
  );
};

const AppShell = () => {
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useContext(AuthContext);

  const [titleTarget, setTitleTarget] = useState(null);
  const [actionsTarget, setActionsTarget] = useState(null);
  const [backTarget, setBackTarget] = useState(null);

  return (
    <HeaderPortalContext.Provider value={{ titleTarget, actionsTarget, backTarget, openMenu: () => setIsMenuOpen(true) }}>
      <div className="min-h-screen bg-base pb-[80px]">
        
        {/* Header Centralisé */}
        <header className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-border h-[56px] flex items-center px-4 max-w-md mx-auto justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* Back Target Portal */}
            <div ref={setBackTarget} className="peer flex items-center shrink-0" />
            
            {/* Default Menu Button (hidden if back target is not empty) */}
            <button 
              onClick={() => setIsMenuOpen(true)} 
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/[0.06] text-secondary hover:text-primary transition-colors shrink-0 peer-[:not(:empty)]:hidden -ml-2.5"
            >
              <Menu size={22} />
            </button>

            {/* Title Target Portal */}
            <div ref={setTitleTarget} className="text-sm font-bold text-primary truncate leading-tight flex items-center min-w-0" />
          </div>

          {/* Actions Target Portal */}
          <div ref={setActionsTarget} className="flex items-center gap-2 text-secondary shrink-0" />
        </header>

        {/* Main Content */}
        <main className="max-w-md mx-auto p-4">
          <Outlet />
        </main>

        {/* Navigation */}
        <BottomTabBar onPlusClick={() => setIsTxFormOpen(true)} />

        {/* Global Transaction Form */}
        <TransactionFormSheet 
          isOpen={isTxFormOpen} 
          onClose={() => setIsTxFormOpen(false)} 
        />

        {/* Global Burger Menu Sheet */}
        <MenuSheet 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)} 
          onLogout={logout}
        />
      </div>
    </HeaderPortalContext.Provider>
  );
};

export default AppShell;

