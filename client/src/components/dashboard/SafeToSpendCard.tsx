import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, AlertCircle, Calendar, ArrowDownRight, PiggyBank, Sparkles } from 'lucide-react';
import { SafeToSpendSummary } from '@shared/types';
import api from '../../services/api';

export const SafeToSpendCard: React.FC = () => {
  const [data, setData] = useState<SafeToSpendSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <div className="h-44 rounded-2xl bg-surface/50 border border-border/40 animate-pulse mb-6" />;
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

  const statusBadge = {
    healthy: {
      text: 'Sain & Sécurisé',
      color: 'bg-accent/10 text-accent border-accent/20',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    warning: {
      text: 'Attention Recommandée',
      color: 'bg-warning/10 text-warning border-warning/20',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    critical: {
      text: 'Budget Critique',
      color: 'bg-danger/10 text-danger border-danger/20',
      icon: <AlertCircle className="w-4 h-4" />
    }
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="banky-card relative overflow-hidden p-6 mb-6 border border-border/40 hover:border-border/80 transition-all duration-200"
    >
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-copper-dim text-copper border border-copper/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary tracking-tight">Restant à Dépenser (Safe-to-Spend)</h3>
            <p className="text-[11px] text-muted font-medium">Budget réel disponible sans risque d'ici la fin du mois</p>
          </div>
        </div>

        <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.color}`}>
          {statusBadge.icon}
          <span>{statusBadge.text}</span>
        </div>
      </div>

      {/* Main Grid Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mt-2">
        <div>
          <div className="text-3xl lg:text-4xl font-condensed-tight font-extrabold text-primary tracking-tight">
            {totalSafeToSpend.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>

          <div className="flex items-center space-x-2 mt-2">
            <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/20">
              {dailyBudgetRemaining.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / jour
            </span>
            <span className="text-xs text-muted font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {daysLeftInMonth} jours restants
            </span>
          </div>
        </div>

        {/* Deduction Breakdown Pill Badges */}
        <div className="flex flex-wrap md:justify-end gap-2 text-xs">
          <div className="flex items-center space-x-1.5 bg-surface-2/80 border border-border/40 px-3 py-1.5 rounded-xl text-secondary">
            <ArrowDownRight className="w-4 h-4 text-danger" />
            <span>Charges prévues : <strong>{upcomingExpenses.toLocaleString('fr-FR')} €</strong></span>
          </div>

          <div className="flex items-center space-x-1.5 bg-surface-2/80 border border-border/40 px-3 py-1.5 rounded-xl text-secondary">
            <PiggyBank className="w-4 h-4 text-purple" />
            <span>Épargne réservée : <strong>{allocatedToSavings.toLocaleString('fr-FR')} €</strong></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
