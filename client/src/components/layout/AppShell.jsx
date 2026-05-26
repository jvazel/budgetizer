import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import BottomTabBar from './BottomTabBar';
import TransactionFormSheet from '../transactions/TransactionFormSheet';
import MenuSheet from './MenuSheet';
import { AuthContext } from '../../context/AuthContext';

const AppShell = ({ children, title, actions, backTo }) => {
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-base pb-[80px]">
      
      {/* Header Centralisé */}
      <header className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-border h-[56px] flex items-center px-4 max-w-md mx-auto justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {backTo ? (
            <button 
              onClick={() => navigate(backTo)} 
              className="p-1 -ml-1 rounded-full hover:bg-border/40 text-muted hover:text-primary transition-colors shrink-0"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            <button 
              onClick={() => setIsMenuOpen(true)} 
              className="p-1 -ml-1 rounded-full hover:bg-border/40 text-muted hover:text-primary transition-colors shrink-0"
            >
              <Menu size={24} />
            </button>
          )}
          {title && <h1 className="text-sm font-bold text-primary truncate capitalize leading-tight">{title}</h1>}
        </div>

        {actions && (
          <div className="flex items-center gap-3 text-muted shrink-0">
            {actions}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4">
        {children}
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
  );
};

export default AppShell;
