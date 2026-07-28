import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  color?: 'emerald' | 'rose' | 'cyan' | 'purple' | 'amber' | 'slate';
  className?: string;
}

const colorMap = {
  emerald: {
    glow: 'from-emerald-500/20 to-teal-500/0',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    button: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25',
  },
  rose: {
    glow: 'from-rose-500/20 to-pink-500/0',
    iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    button: 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25',
  },
  cyan: {
    glow: 'from-cyan-500/20 to-blue-500/0',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    button: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25',
  },
  purple: {
    glow: 'from-purple-500/20 to-indigo-500/0',
    iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    button: 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25',
  },
  amber: {
    glow: 'from-amber-500/20 to-orange-500/0',
    iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    button: 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25',
  },
  slate: {
    glow: 'from-slate-500/15 to-slate-500/0',
    iconBg: 'bg-slate-500/10 border-slate-500/20 text-slate-300',
    button: 'bg-slate-700/40 text-slate-200 border-slate-600/40 hover:bg-slate-700/60',
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  color = 'cyan',
  className = '',
}) => {
  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden flex flex-col items-center justify-center text-center p-6 md:p-8 bg-surface-1/70 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl ${className}`}
    >
      {/* Background glow aura */}
      <div
        className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-radial ${scheme.glow} rounded-full blur-2xl pointer-events-none opacity-60`}
      />

      {Icon && (
        <div className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 shadow-lg ${scheme.iconBg}`}>
          <Icon size={26} />
        </div>
      )}

      <h4 className="relative z-10 text-base font-bold text-slate-100 mb-1.5">{title}</h4>
      <p className="relative z-10 text-xs text-slate-400 max-w-xs leading-relaxed mb-5">{description}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all shadow-md active:scale-95 ${scheme.button}`}
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 border border-white/10 rounded-xl transition-all active:scale-95"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;

