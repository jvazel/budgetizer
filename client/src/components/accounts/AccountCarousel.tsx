import React from 'react';
import { Plus } from 'lucide-react';
import AccountCard from './AccountCard';

interface AccountCarouselProps {
  accounts: any[];
  onAddClick?: () => void;
  onEditClick?: (account: any) => void;
}

const AccountCarousel: React.FC<AccountCarouselProps> = ({ accounts, onAddClick, onEditClick }) => {
  return (
    <div className="w-full relative">
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-4 no-scrollbar">
        {accounts.map((account) => (
          <AccountCard
            key={account._id}
            account={account}
            onClick={() => onEditClick && onEditClick(account)}
          />
        ))}

        {/* Add new account card */}
        <div 
          onClick={onAddClick}
          className="snap-start shrink-0 w-[272px] sm:w-[290px] aspect-[1.586/1] rounded-[24px] border-2 border-dashed border-copper/30 bg-surface-2/10 hover:bg-copper-dim/20 hover:border-copper/60 active-spring-sm active-card-feedback cursor-pointer flex flex-col items-center justify-center gap-2.5 select-none transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-full bg-copper-dim/40 border border-copper/30 flex items-center justify-center text-copper group-hover:scale-110 transition-transform shadow-sm">
            <Plus size={20} />
          </div>
          <span className="text-xs font-bold text-primary group-hover:text-copper transition-colors">Ajouter un compte</span>
        </div>
      </div>
    </div>
  );
};

export default AccountCarousel;
