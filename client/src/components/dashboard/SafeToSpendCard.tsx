import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, AlertCircle, Calendar, ArrowDownRight, PiggyBank, Sparkles, Eye, EyeOff } from 'lucide-react';
import { SafeToSpendSummary } from '@shared/types';
import api from '../../services/api';
import { triggerHaptic } from '../../utils/hapticHelper';
import AmountDisplay from '../ui/AmountDisplay';

export const SafeToSpendCard: React.FC = () => {
  const [data, setData] = useState<SafeToSpendSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSafeToSpend = async () => {
      try {
        const response = await api.get<SafeToSpendSummary>('/dashboard/safe-to-spend');
        if (isMounted) {
          setData(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Impossible de calculer le restant à dépenser.');
          setLoading(false);
        }
      }
    };

    fetchSafeToSpend();
    return () => {
      isMounted = false;
    };
  }, []);

  const togglePrivacy = () => {
    triggerHaptic('light');
    setIsPrivate(!isPrivate);
  };

  if (loading) {
    return <div className="h-48 rounded-3xl bg-surface-2/40 border border-border/40 animate-pulse mb-6 glass-card" />;
  }

  if (error || !data) {
    return null;
  }

  const {
    totalSafeToSpend,
    dailyBudgetRemaining,
    daysLeftInMonth,
    upcomingExpenses,
    allocatedToSavings,
    status
  } = data;

  const statusConfig = {
    healthy: {
      text: 'Sain & Sécurisé',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      glow: 'from-emerald-500/15 via-teal-500/5 to-transparent',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    warning: {
      text: 'Attention Recommandée',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      glow: 'from-amber-500/15 via-orange-500/5 to-transparent',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    critical: {
      text: 'Budget Critique',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse',
      glow: 'from-rose-500/20 via-red-500/10 to-transparent',
      icon: <AlertCircle className="w-4 h-4" />
    }
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-card relative overflow-hidden p-6 mb-6 rounded-3xl border border-white/10 shadow-neobank group"
    >
      {/* Background Dynamic Aura Glow */}
      <div className={`absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl ${statusConfig.glow} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />

      {/* Header Row */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-copper/10 text-amber-400 border border-amber-500/30 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary tracking-tight">Restant à Dépenser</h3>
              <button 
                onClick={togglePrivacy}
                className="text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-white/5 active-scale-sm"
                title={isPrivate ? "Afficher le montant" : "Masquer le montant"}
              >
                {isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-muted font-medium">Budget réel net d'ici la fin du mois</p>
          </div>
        </div>

        <div className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md transition-all ${statusConfig.color}`}>
          {statusConfig.icon}
          <span>{statusConfig.text}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end relative z-10 mt-1">
        <div>
          <div className="text-4xl lg:text-5xl font-condensed-tight font-extrabold tracking-tight">
            {isPrivate ? (
              <span className="text-primary">•••• €</span>
            ) : (
              <AmountDisplay
                amount={totalSafeToSpend}
                size="4xl"
                type={totalSafeToSpend >= 0 ? 'income' : 'expense'}
              />
            )}
          </div>

          <div className="flex items-center space-x-2.5 mt-3">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 backdrop-blur-sm shadow-sm inline-flex items-center gap-1">
              {isPrivate ? (
                '•• € / jour'
              ) : (
                <>
                  <AmountDisplay amount={dailyBudgetRemaining} size="xs" type="income" />
                  <span className="text-muted font-normal">/ jour</span>
                </>
              )}
            </span>
            <span className="text-xs text-muted font-semibold flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-xl border border-white/5">
              <Calendar className="w-3.5 h-3.5 text-secondary" /> {daysLeftInMonth} jours restants
            </span>
          </div>
        </div>

        {/* Deduction Breakdown Pill Badges */}
        <div className="flex flex-wrap md:justify-end gap-2.5 text-xs">
          <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-2xl text-secondary shadow-sm hover:border-white/20 transition-all">
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
            <span>Charges prévues : <strong className="text-primary font-premium-numbers">{isPrivate ? '••• €' : `${upcomingExpenses.toLocaleString('fr-FR')} €`}</strong></span>
          </div>

          <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-2xl text-secondary shadow-sm hover:border-white/20 transition-all">
            <PiggyBank className="w-4 h-4 text-indigo-400" />
            <span>Épargne réservée : <strong className="text-primary font-premium-numbers">{isPrivate ? '••• €' : `${allocatedToSavings.toLocaleString('fr-FR')} €`}</strong></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
