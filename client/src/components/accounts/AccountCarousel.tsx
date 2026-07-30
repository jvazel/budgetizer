import React from 'react';
import { Wallet, CreditCard, Landmark, Coins, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreditAccountCard from './CreditAccountCard';
import AmountDisplay from '../ui/AmountDisplay';

const AccountCarousel = ({ accounts, onAddClick, onEditClick }) => {
  const navigate = useNavigate();

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'credit-card': return <CreditCard size={24} className="text-white opacity-80" />;
      case 'landmark': return <Landmark size={24} className="text-white opacity-80" />;
      case 'coins': return <Coins size={24} className="text-white opacity-80" />;
      default: return <Wallet size={24} className="text-white opacity-80" />;
    }
  };

  const formatCurrency = (amount, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);
  };

  return (
    <div className="w-full relative">
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-4 no-scrollbar">
        {accounts.map((account) => {
          if (account.type === 'credit') {
            return (
              <CreditAccountCard 
                key={account._id}
                account={account}
                onClick={() => navigate(`/accounts/${account._id}/credit`)}
              />
            );
          }

          return (
            <div 
              key={account._id}
              onClick={() => onEditClick && onEditClick(account)}
              className="snap-center shrink-0 w-[300px] h-[180px] rounded-[24px] p-6 flex flex-col justify-between shadow-lg cursor-pointer transition-transform active:scale-95"
              style={{ 
                background: `linear-gradient(135deg, ${account.color} 0%, ${account.color}dd 100%)`,
              }}
            >
              <div className="flex justify-between items-start">
                <span className="text-white/90 font-medium">{account.name}</span>
                {getIcon(account.icon)}
              </div>
              
              <div>
                <p className="text-white/70 text-sm mb-1">Solde actuel</p>
                <div className="text-white">
                  <AmountDisplay amount={account.balance} size="2xl" type="neutral" />
                </div>
              </div>
            </div>
          );
        })}

        {/* Add new account card */}
        <div 
          onClick={onAddClick}
          className="snap-center shrink-0 w-[300px] h-[180px] rounded-[24px] border-2 border-dashed border-border flex flex-col items-center justify-center text-muted hover:text-primary hover:border-muted transition-colors cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
            <Plus size={24} />
          </div>
          <span className="font-medium">Ajouter un compte</span>
        </div>
      </div>
    </div>
  );
};

export default AccountCarousel;
