import React from 'react';
import { Landmark, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import AmountDisplay from '../ui/AmountDisplay';

interface HeroPatrimoineCardProps {
  totalBalance: number;
  accountsCount: number;
  onClick?: () => void;
  isMasked?: boolean;
}

export const HeroPatrimoineCard: React.FC<HeroPatrimoineCardProps> = ({
  totalBalance,
  accountsCount,
  onClick,
  isMasked
}) => {
  return (
    <div
      onClick={onClick}
      className="snap-start shrink-0 w-[272px] sm:w-[290px] aspect-[1.586/1] rounded-[24px] border border-copper/30 p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none bg-gradient-to-br from-surface-1 via-copper-dim/40 to-surface-2 shadow-xl hover:shadow-copper/10 hover:border-copper/50 active-spring-sm active-card-feedback transition-all duration-300 group"
    >
      {/* Premium Metallic & Copper Glowing Auras */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-copper/20 rounded-full blur-3xl pointer-events-none group-hover:bg-copper/30 transition-all duration-500" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple/15 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Shimmer Line */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

      {/* Top Header */}
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-copper-dim border border-copper/30 flex items-center justify-center text-copper shadow-sm shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-primary uppercase tracking-wider">Patrimoine Net</h4>
            <span className="text-[8.5px] font-extrabold text-copper tracking-wide uppercase">
              {accountsCount} {accountsCount > 1 ? 'comptes actifs' : 'compte actif'}
            </span>
          </div>
        </div>

        <div className="w-6 h-6 rounded-full bg-copper-dim/60 border border-copper/30 flex items-center justify-center text-copper group-hover:bg-copper group-hover:text-surface-1 transition-all duration-200">
          <ArrowUpRight size={13} />
        </div>
      </div>

      {/* Center Amount */}
      <div className="relative z-10 my-auto pt-1">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-secondary opacity-70">
          Solde Total Global
        </span>
        <div className="mt-0.5">
          <AmountDisplay
            amount={totalBalance}
            size="2xl"
            type={totalBalance >= 0 ? 'income' : 'expense'}
            isMasked={isMasked}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center relative z-10 border-t border-copper/15 pt-2">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-secondary">
          <ShieldCheck size={12} className="text-copper shrink-0" />
          <span>Calcul consolidé</span>
        </div>
        <span className="text-[8.5px] font-mono font-black text-copper uppercase tracking-widest bg-copper-dim/40 px-2 py-0.5 rounded-full border border-copper/20">
          Vue 360°
        </span>
      </div>
    </div>
  );
};

export default HeroPatrimoineCard;
