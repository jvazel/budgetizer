import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GitCommit, ArrowRight, Wallet, TrendingUp, TrendingDown, PiggyBank, AlertCircle } from 'lucide-react';
import { SankeyFlowResponse } from '@shared/types';
import api from '../../services/api';

interface SankeyFlowChartProps {
  period?: string;
  startDate?: string;
  endDate?: string;
}

export const SankeyFlowChart: React.FC<SankeyFlowChartProps> = ({ period, startDate, endDate }) => {
  const [data, setData] = useState<SankeyFlowResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchSankeyData = async () => {
      try {
        const params: Record<string, string> = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get<SankeyFlowResponse>('/charts/sankey', { params });
        if (isMounted) {
          setData(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Impossible de charger le diagramme de flux.');
          setLoading(false);
        }
      }
    };

    fetchSankeyData();
    return () => {
      isMounted = false;
    };
  }, [period, startDate, endDate]);


  if (loading) {
    return <div className="h-64 rounded-2xl bg-surface/50 border border-border/40 animate-pulse mb-6" />;
  }

  if (error || !data || data.nodes.length === 0) {
    return null;
  }

  const incomeNodes = data.nodes.filter(n => n.category === 'income');
  const accountNode = data.nodes.find(n => n.category === 'account');
  const expenseNodes = data.nodes.filter(n => n.category === 'expense');
  const savingsNode = data.nodes.find(n => n.category === 'savings');

  const getLinkValue = (sourceId: string, targetId: string) => {
    const link = data.links.find(l => l.source === sourceId && l.target === targetId);
    return link ? link.value : 0;
  };

  const totalIncome = incomeNodes.reduce((sum, node) => sum + getLinkValue(node.id, accountNode?.id || ''), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="banky-card p-6 mb-6 border border-border/40 hover:border-border/80 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple/10 text-purple border border-purple/20">
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary tracking-tight">Diagramme de Flux de Trésorerie (Sankey)</h3>
            <p className="text-[11px] text-muted font-medium">Modélisation visuelle de l'argent depuis les sources jusqu'aux dépenses et à l'épargne</p>
          </div>
        </div>
      </div>

      {/* Sankey Flow Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Colonne 1 : Revenus */}
        <div className="space-y-3">
          <span className="premium-label text-accent block mb-2">1. Sources d'Entrées</span>
          {incomeNodes.map(node => {
            const val = getLinkValue(node.id, accountNode?.id || '');
            return (
              <div key={node.id} className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-primary">{node.name}</span>
                </div>
                <span className="text-xs font-bold text-accent">+{val.toLocaleString('fr-FR')} €</span>
              </div>
            );
          })}
        </div>

        {/* Colonne 2 : Trésorerie Centrale (Hub) */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-2/80 border border-border/40 relative">
          <div className="p-3 rounded-full bg-copper-dim text-copper mb-2 border border-copper/20">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-primary">{accountNode?.name || 'Trésorerie'}</span>
          <span className="text-lg font-condensed-tight font-extrabold text-copper mt-1">
            {totalIncome.toLocaleString('fr-FR')} €
          </span>
          <span className="text-[10px] text-muted mt-1">Nœud de distribution</span>
        </div>

        {/* Colonne 3 : Dépenses & Épargne */}
        <div className="space-y-3">
          <span className="premium-label text-danger block mb-2">2. Sorties & Affectation</span>
          {expenseNodes.map(node => {
            const val = getLinkValue(accountNode?.id || '', node.id);
            return (
              <div key={node.id} className="p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-danger" />
                  <span className="text-xs font-semibold text-primary">{node.name}</span>
                </div>
                <span className="text-xs font-bold text-danger">-{val.toLocaleString('fr-FR')} €</span>
              </div>
            );
          })}

          {/* Épargne Résiduelle */}
          {savingsNode && (
            <div className="p-3 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PiggyBank className="w-4 h-4 text-purple" />
                <span className="text-xs font-semibold text-primary">{savingsNode.name}</span>
              </div>
              <span className="text-xs font-bold text-purple">
                +{getLinkValue(accountNode?.id || '', savingsNode.id).toLocaleString('fr-FR')} €
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
