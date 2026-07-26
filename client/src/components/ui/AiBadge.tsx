import React from 'react';
import { Sparkles } from 'lucide-react';

const AiBadge = ({ text = "Suggéré par l'IA", className = "" }) => {
  return (
    <span 
      className={`inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-500 font-extrabold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-full select-none shrink-0 ${className}`}
    >
      <Sparkles size={9} className="animate-pulse" />
      <span>{text}</span>
    </span>
  );
};

export default AiBadge;
