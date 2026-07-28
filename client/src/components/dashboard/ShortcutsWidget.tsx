import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Target,
  BarChart2,
  Wallet,
  Award,
  Sparkles,
  Clock,
  ArrowLeftRight,
  GripVertical
} from 'lucide-react';

export interface ShortcutItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  color: string;
  iconBg: string;
}

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'budgets',
    label: 'Budgets',
    icon: CreditCard,
    path: '/budgets',
    color: 'border-amber-500/30 hover:border-amber-500/50',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  },
  {
    id: 'savings',
    label: 'Épargne',
    icon: Target,
    path: '/savings',
    color: 'border-emerald-500/30 hover:border-emerald-500/50',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'charts',
    label: 'Analyses',
    icon: BarChart2,
    path: '/charts',
    color: 'border-cyan-500/30 hover:border-cyan-500/50',
    iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
  },
  {
    id: 'subscriptions',
    label: 'Abonnements',
    icon: Wallet,
    path: '/subscriptions',
    color: 'border-purple-500/30 hover:border-purple-500/50',
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  },
  {
    id: 'scores',
    label: 'Scores',
    icon: Award,
    path: '/financial-scores',
    color: 'border-pink-500/30 hover:border-pink-500/50',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  },
  {
    id: 'insights',
    label: 'Conseils IA',
    icon: Sparkles,
    path: '/ai-insights',
    color: 'border-indigo-500/30 hover:border-indigo-500/50',
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
  },
  {
    id: 'scheduled',
    label: 'Échéances',
    icon: Clock,
    path: '/scheduled',
    color: 'border-sky-500/30 hover:border-sky-500/50',
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
  },
  {
    id: 'transfers',
    label: 'Virements',
    icon: ArrowLeftRight,
    path: '/transfers',
    color: 'border-teal-500/30 hover:border-teal-500/50',
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
  },
];

interface ShortcutsWidgetProps {
  isEditing?: boolean;
  className?: string;
}

export const ShortcutsWidget: React.FC<ShortcutsWidgetProps> = ({
  isEditing = false,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`banky-card p-4 md:p-5 relative overflow-hidden select-none border border-border/40 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          {isEditing && <GripVertical className="text-secondary cursor-grab active:cursor-grabbing" size={18} />}
          <h3 className="text-sm font-bold text-primary tracking-tight">Accès Rapides</h3>
        </div>
        <span className="text-[11px] text-secondary font-medium">8 modules</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 md:gap-3">
        {DEFAULT_SHORTCUTS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => !isEditing && navigate(item.path)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border bg-surface-2/40 hover:bg-surface-2/80 backdrop-blur-md transition-all text-center group ${item.color}`}
            >
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mb-1.5 shadow-sm transition-transform group-hover:scale-110 ${item.iconBg}`}>
                <Icon size={18} />
              </div>
              <span className="text-[10px] font-extrabold text-primary group-hover:text-copper transition-colors line-clamp-1">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ShortcutsWidget;

