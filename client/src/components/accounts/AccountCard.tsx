import React from 'react';
import { Wallet, PiggyBank, CreditCard, Coins, TrendingUp, ArrowUpRight, ShieldCheck, Landmark } from 'lucide-react';
import AmountDisplay from '../ui/AmountDisplay';

interface AccountCardProps {
  account: {
    _id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | string;
    balance: number;
    currency?: string;
    color?: string;
    icon?: string;
    includeInTotal?: boolean;
    lastTransactionDate?: string | Date;
    creditDetails?: {
      initialAmount?: number;
      durationMonths?: number;
      monthlyPayment?: number;
    };
  };
  onClick?: () => void;
  isMasked?: boolean;
  className?: string;
}

export const getAccountIcon = (type: string, size = 16) => {
  const props = { size, className: 'shrink-0' };
  switch (type) {
    case 'checking':   return <Wallet {...props} />;
    case 'savings':    return <PiggyBank {...props} />;
    case 'credit':     return <CreditCard {...props} />;
    case 'cash':       return <Coins {...props} />;
    case 'investment': return <TrendingUp {...props} />;
    default:           return <Landmark {...props} />;
  }
};

export const getAccountTypeName = (type: string) => {
  switch (type) {
    case 'checking':   return 'Compte Courant';
    case 'savings':    return 'Épargne';
    case 'credit':     return 'Crédit';
    case 'cash':       return 'Espèces';
    case 'investment': return 'Investissement';
    default:           return 'Compte';
  }
};

export const AccountCard: React.FC<AccountCardProps> = ({ account, onClick, isMasked, className = '' }) => {
  const isNegative = account.balance < 0;
  const mainColor = account.color || '#10b981';
  const isCredit = account.type === 'credit';

  // Credit calculation details if credit type
  const creditInitial = account.creditDetails?.initialAmount || Math.abs(account.balance) || 1;
  const creditRemaining = Math.abs(account.balance);
  const creditPaid = Math.max(0, creditInitial - creditRemaining);
  const creditProgress = Math.min(100, Math.round((creditPaid / creditInitial) * 100));

  return (
    <div
      onClick={onClick}
      className={`snap-start shrink-0 w-[272px] sm:w-[290px] aspect-[1.586/1] rounded-[24px] border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none bg-surface-1 shadow-lg hover:shadow-2xl hover:border-white/20 active-spring-sm active-card-feedback transition-all duration-300 group ${className}`}
    >
      {/* Atmosphere Glow (Neo-Glow Aura) */}
      <div 
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 group-hover:opacity-35 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: mainColor }}
      />
      <div 
        className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ backgroundColor: mainColor }}
      />

      {/* Decorative Metallic Micro Chip SVG */}
      <div className="absolute top-5 right-5 opacity-25 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none">
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="18" rx="3.5" fill="currentColor" className="text-secondary" />
          <path d="M7 0V18M17 0V18M0 9H24" stroke="currentColor" strokeWidth="1" className="text-surface-1" />
        </svg>
      </div>

      {/* Header Row */}
      <div className="flex justify-between items-start gap-2 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0 pr-6">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center border backdrop-blur-md transition-transform group-hover:scale-105 shrink-0"
            style={{ 
              backgroundColor: `${mainColor}18`, 
              borderColor: `${mainColor}35`, 
              color: mainColor 
            }}
          >
            {getAccountIcon(account.type, 16)}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider truncate leading-tight">{account.name}</h4>
            <span className="inline-block text-[8.5px] font-bold text-secondary opacity-70 tracking-wide uppercase mt-0.5">
              {getAccountTypeName(account.type)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Balance Section */}
      <div className="relative z-10 my-auto pt-1">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-secondary opacity-60">
          {isCredit ? 'Capital restant dû' : 'Solde Actuel'}
        </span>
        <div className="mt-0.5">
          <AmountDisplay
            amount={account.balance}
            size="2xl"
            type={isCredit ? 'expense' : isNegative ? 'expense' : 'neutral'}
            isMasked={isMasked}
          />
        </div>

        {/* Credit Progress Bar if Credit Account */}
        {isCredit && (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-full bg-surface-2/80 rounded-full overflow-hidden border border-border/40">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                style={{ width: `${creditProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-secondary font-bold">
              <span>{creditProgress}% remboursé</span>
              <AmountDisplay amount={creditPaid} size="xs" type="neutral" isMasked={isMasked} />
            </div>
          </div>
        )}
      </div>

      {/* Footer Row */}
      <div className="flex justify-between items-end relative z-10 border-t border-border/20 pt-2">
        <span className="text-[9px] text-secondary font-medium tracking-wide opacity-80">
          {account.lastTransactionDate 
            ? `Dernière op. : ${new Date(account.lastTransactionDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
            : 'Aucune opération'}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {account.includeInTotal !== false && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-live" title="Inclus dans le patrimoine total" />
          )}
          <span className="text-[8.5px] font-mono font-extrabold text-secondary opacity-70 uppercase tracking-widest">
            {account.currency || 'EUR'}
          </span>
          <ArrowUpRight size={12} className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-0.5" />
        </div>
      </div>
    </div>
  );
};

export default AccountCard;
