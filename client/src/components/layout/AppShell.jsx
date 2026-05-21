import React, { useState } from 'react';
import BottomTabBar from './BottomTabBar';
import TransactionFormSheet from '../transactions/TransactionFormSheet';

const AppShell = ({ children, header }) => {
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base pb-[80px]">
      
      {/* Header Contextuel */}
      {header && (
        <header className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-border h-[56px] flex items-center px-4 max-w-md mx-auto">
          {header}
        </header>
      )}

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
    </div>
  );
};

export default AppShell;
