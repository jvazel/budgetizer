import React from 'react';
import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import AmountDisplay from '../ui/AmountDisplay';
import { useTiltEffect } from '../../hooks/useTiltEffect';

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
  const {
    cardRef,
    style: tiltStyle,
    glareStyle,
    handleMouseMove,
    handleMouseLeave,
    handleTouchMove,
    handleTouchEnd,
  } = useTiltEffect<HTMLDivElement>({ maxTiltDeg: 16, glareOpacity: 0.5, scale: 1.04 });

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={tiltStyle}
      className="snap-start shrink-0 w-[272px] sm:w-[290px] aspect-[1.586/1] rounded-[24px] border border-copper/30 p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none bg-gradient-to-br from-surface-1 via-copper-dim/40 to-surface-2 shadow-xl hover:shadow-copper/20 hover:border-copper/60 active-spring-sm active-card-feedback transition-all duration-300 group"
    >
      {/* Translucent Dynamic Glare Sheen Layer */}
      <div className="absolute inset-0 rounded-[24px] z-30 pointer-events-none transition-opacity duration-300" style={glareStyle} />

      {/* Premium Metallic & Copper Glowing Auras */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-copper/20 rounded-full blur-3xl pointer-events-none group-hover:bg-copper/30 transition-all duration-500" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with 3D Depth */}
      <div className="flex justify-between items-start relative z-10" style={{ transform: 'translateZ(26px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-copper-dim border border-copper/30 flex items-center justify-center text-copper shadow-sm shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-primary uppercase tracking-wider drop-shadow-sm">Patrimoine Net</h4>
            <span className="text-[8.5px] font-extrabold text-copper tracking-wide uppercase">
              {accountsCount} {accountsCount > 1 ? 'comptes actifs' : 'compte actif'}
            </span>
          </div>
        </div>

        <div className="w-6 h-6 rounded-full bg-copper-dim/60 border border-copper/30 flex items-center justify-center text-copper group-hover:bg-copper group-hover:text-surface-1 transition-all duration-200 shadow-sm">
          <ArrowUpRight size={13} />
        </div>
      </div>

      {/* Center Amount with 3D Depth */}
      <div className="relative z-10 my-auto pt-1" style={{ transform: 'translateZ(34px)' }}>
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-secondary opacity-70">
          Solde Total Global
        </span>
        <div className="mt-0.5 drop-shadow-md">
          <AmountDisplay
            amount={totalBalance}
            size="2xl"
            type={totalBalance >= 0 ? 'income' : 'expense'}
            isMasked={isMasked}
          />
        </div>
      </div>

      {/* Footer Info with 3D Depth */}
      <div className="flex justify-between items-center relative z-10 border-t border-copper/15 pt-2" style={{ transform: 'translateZ(18px)' }}>
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-secondary">
          <ShieldCheck size={12} className="text-copper shrink-0" />
          <span>Calcul consolidé</span>
        </div>
        <span className="text-[8.5px] font-mono font-black text-copper uppercase tracking-widest bg-copper-dim/40 px-2 py-0.5 rounded-full border border-copper/20 shadow-sm">
          Vue 360°
        </span>
      </div>
    </div>
  );
};

export default HeroPatrimoineCard;
