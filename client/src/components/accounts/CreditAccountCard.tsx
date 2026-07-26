import React from 'react';
import { Landmark, CreditCard } from 'lucide-react';

const CreditAccountCard = ({ account, onClick }) => {
  const details = account.creditDetails || {};
  const initialAmount = details.initialAmount || 1;
  const currentBalance = account.balance || 0;
  
  const capitalRemaining = Math.abs(currentBalance);
  const capitalPaid = Math.max(0, initialAmount - capitalRemaining);
  const progressPercentage = Math.min(100, Math.round((capitalPaid / initialAmount) * 100));

  const duration = details.durationMonths || 0;
  // Estimate months remaining: duration * (capital remaining / initial amount)
  const monthsRemaining = Math.max(0, Math.round(duration * (capitalRemaining / initialAmount)));

  const formatCurrency = (amount, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);
  };

  return (
    <div 
      onClick={onClick}
      className="snap-center shrink-0 w-[300px] h-[180px] rounded-[24px] p-5 flex flex-col justify-between shadow-xl cursor-pointer transition-all active:scale-95 border border-white/5 relative overflow-hidden select-none"
      style={{ 
        background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
      }}
    >
      {/* Premium glowing background dots */}
      <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top row */}
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <Landmark size={18} className="text-white/80 shrink-0" />
          <span className="text-white font-semibold text-sm truncate">{account.name}</span>
        </div>
        <span className="text-[10px] font-black tracking-widest text-red-200/90 bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-500/20 shrink-0">
          🏦 CRÉDIT
        </span>
      </div>

      {/* Balance row */}
      <div className="my-2 relative z-10">
        <p className="text-white/60 text-[9px] font-medium uppercase tracking-wider">Capital restant dû</p>
        <h2 className="text-red-400 font-mono text-2xl font-bold tracking-tight leading-tight mt-0.5" style={{ color: 'var(--danger)' }}>
          {formatCurrency(currentBalance, account.currency)}
        </h2>
      </div>

      {/* Progress row */}
      <div className="space-y-1 relative z-10">
        <div className="h-1.5 w-full bg-red-950/60 rounded-full overflow-hidden border border-red-900/20">
          <div 
            className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%`, backgroundColor: '#10b981' }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-white/70 font-semibold">
          <span>{progressPercentage}% remboursé</span>
          <span className="font-mono text-white/50">{formatCurrency(capitalPaid, account.currency)}</span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="text-[10px] text-white/80 font-medium flex justify-between items-center border-t border-white/5 pt-2 relative z-10">
        <span>{formatCurrency(details.monthlyPayment || 0, account.currency)}/mois</span>
        <span>·</span>
        <span>{monthsRemaining} mois restants</span>
      </div>
    </div>
  );
};

export default CreditAccountCard;
