import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle } from 'lucide-react';
import { KpiCardXXL } from './KpiCardXXL';
import { KpiSummaryResponse } from '@shared/types';
import api from '../../services/api';

export const KpiHeaderGrid: React.FC = () => {
  const [data, setData] = useState<KpiSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchKpiData = async () => {
      try {
        const response = await api.get<KpiSummaryResponse>('/dashboard/kpi-summary');
        if (isMounted) {
          setData(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Impossible de charger les métriques KPI.');
          setLoading(false);
        }
      }
    };

    fetchKpiData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-800/40 animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-2 mb-6">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error || 'Données non disponibles'}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Revenus */}
      <KpiCardXXL
        title="Revenus du Mois"
        metric={data.income}
        colorScheme="income"
        icon={<TrendingUp className="w-5 h-5" />}
      />

      {/* 2. Dépenses */}
      <KpiCardXXL
        title="Dépenses du Mois"
        metric={data.expenses}
        colorScheme="expense"
        icon={<TrendingDown className="w-5 h-5" />}
      />

      {/* 3. Solde Net */}
      <KpiCardXXL
        title="Solde Net"
        metric={data.net}
        colorScheme="net"
        icon={<Wallet className="w-5 h-5" />}
      />

      {/* 4. Taux d'Épargne */}
      <KpiCardXXL
        title="Taux d'Épargne"
        metric={data.savingsRate}
        isPercentage={true}
        colorScheme="analytics"
        icon={<PiggyBank className="w-5 h-5" />}
      />
    </div>
  );
};
