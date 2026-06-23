import React, { useState, useEffect, useContext, createContext, Suspense } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import BottomTabBar from './BottomTabBar';
import TransactionFormSheet from '../transactions/TransactionFormSheet';
import MenuSheet from './MenuSheet';
import { AuthContext } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export const HeaderPortalContext = createContext({
  titleTarget: null,
  actionsTarget: null,
  backTarget: null,
  openMenu: () => {},
  isScrolled: false,
  setCollapsible: () => {},
});

export const HeaderTitle = ({ children, collapsible = false }) => {
  const { titleTarget, setCollapsible } = useContext(HeaderPortalContext);
  
  useEffect(() => {
    if (collapsible && setCollapsible) {
      setCollapsible(true);
      return () => setCollapsible(false);
    }
  }, [collapsible, setCollapsible]);

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
      className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/[0.06] active:scale-95 text-secondary hover:text-primary transition-all shrink-0 -ml-3.5"
    >
      <ChevronLeft size={24} />
    </button>,
    backTarget
  );
};

const AppShell = () => {
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useContext(AuthContext);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new-transaction') {
      setIsTxFormOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  // Scroll to top and reset header scrolled state on route transition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    setIsScrolled(false);
  }, [location.pathname]);

  const [titleTarget, setTitleTarget] = useState(null);
  const [actionsTarget, setActionsTarget] = useState(null);
  const [backTarget, setBackTarget] = useState(null);

  // Collapsible header states & listener
  const [isScrolled, setIsScrolled] = useState(false);
  const [collapsible, setCollapsible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HeaderPortalContext.Provider value={{ 
      titleTarget, 
      actionsTarget, 
      backTarget, 
      openMenu: () => setIsMenuOpen(true),
      isScrolled,
      setCollapsible
    }}>
      <div className="min-h-screen bg-base pb-[calc(80px+env(safe-area-inset-bottom,0px))] relative overflow-x-clip">
        {/* Ambient Background Glow Orbs (Bankyboard theme) */}
        <div className="bg-glow-orb glow-orb-amber w-[300px] h-[300px] -top-20 -left-20" />
        <div className="bg-glow-orb glow-orb-indigo w-[400px] h-[400px] top-[40%] -right-40" />
        <div className="bg-glow-orb glow-orb-emerald w-[300px] h-[300px] -bottom-20 -left-20" />
        
        {/* Header Centralisé */}
        <header className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top,0px)] h-[calc(56px+env(safe-area-inset-top,0px))] flex items-center px-4 max-w-md mx-auto justify-between pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back Target Portal */}
            <div ref={setBackTarget} className="peer flex items-center shrink-0" />
            
            {/* Default Menu Button (hidden if back target is not empty) */}
            <button 
              onClick={() => setIsMenuOpen(true)} 
              className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/[0.06] active:scale-95 text-secondary hover:text-primary transition-all shrink-0 peer-[:not(:empty)]:hidden -ml-3.5"
            >
              <Menu size={24} />
            </button>

            {/* Title Target Portal with collapsible transition */}
            <div 
              ref={setTitleTarget} 
              className={`text-sm font-bold text-primary truncate leading-tight flex items-center min-w-0 transition-all duration-300 ${
                collapsible 
                  ? (isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none') 
                  : 'opacity-100 translate-y-0'
              }`} 
            />
          </div>

          {/* Actions Target Portal */}
          <div ref={setActionsTarget} className="flex items-center gap-2 text-secondary shrink-0" />
        </header>

        {/* Main Content */}
        <main className="max-w-md mx-auto p-4 pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] relative">
          <Suspense fallback={
            <div className="space-y-4 py-6 select-none">
              {/* Shimmers mimicking a typical dashboard/page layout */}
              <div className="h-16 w-full rounded-[24px] bg-surface-2 shimmer-loader" />
              <div className="h-12 w-full rounded-[24px] bg-surface-2 shimmer-loader" />
              <div className="h-48 w-full rounded-[24px] bg-surface-2 shimmer-loader" />
            </div>
          }>
            <Outlet />
          </Suspense>
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

