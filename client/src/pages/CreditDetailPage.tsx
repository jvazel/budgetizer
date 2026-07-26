import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import { Settings, Check, Calendar, Landmark, Info, ArrowUpRight, Percent, Clock, TrendingUp, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import CreditAccountBottomSheet from '../components/accounts/CreditAccountBottomSheet';
import ConfirmModal from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

const CreditDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/accounts/${id}/credit-summary`);
      setSummary(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement du crédit');
      navigate('/accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const handleSave = async (data) => {
    try {
      await api.put(`/accounts/${id}`, data);
      toast.success('Crédit mis à jour');
      fetchSummary();
      setIsEditOpen(false);
    } catch (err) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDelete = async (accountId) => {
    try {
      await api.delete(`/accounts/${accountId}`);
      toast.success('Crédit supprimé');
      navigate('/accounts');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const generateChartData = () => {
    if (!summary) return [];

    const data = [];
    
    // 1. Initial state
    const firstDate = summary.paymentsHistory.length > 0 
      ? new Date(summary.paymentsHistory[summary.paymentsHistory.length - 1].date)
      : new Date(summary.nextPaymentDate || new Date());
    
    // Move 1 month back for the start point
    const startDatePoint = new Date(firstDate);
    startDatePoint.setMonth(startDatePoint.getMonth() - 1);
    
    data.push({
      date: startDatePoint.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      balance: summary.initialAmount,
      type: 'Initial'
    });

    // 2. Add history (chronological order)
    const reversedHistory = [...summary.paymentsHistory].reverse();
    reversedHistory.forEach((pay) => {
      data.push({
        date: new Date(pay.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        balance: Math.abs(pay.balanceAfter),
        type: 'Historique'
      });
    });

    // 3. Add projection for remaining months
    let currentOutstanding = summary.capitalRemaining;
    const rate = summary.interestRate / 100 / 12;
    const monthlyPayment = summary.monthlyPayment;
    const projectionDate = summary.nextPaymentDate ? new Date(summary.nextPaymentDate) : new Date();

    for (let i = 0; i < summary.monthsRemaining; i++) {
      const interestPart = rate > 0 ? currentOutstanding * rate : 0;
      const principalPart = Math.max(0, monthlyPayment - interestPart);
      currentOutstanding = Math.max(0, currentOutstanding - principalPart);

      data.push({
        date: new Date(projectionDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        balance: Number(currentOutstanding.toFixed(2)),
        type: 'Prévision'
      });

      // Advance 1 month
      projectionDate.setMonth(projectionDate.getMonth() + 1);
    }

    return data;
  };

  const actions = summary?.permission === 'owner' ? (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setIsEditOpen(true)}
        className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-accent transition-colors"
        title="Modifier le crédit"
      >
        <Settings size={16} />
      </button>
      <button 
        onClick={() => setIsDeleteConfirmOpen(true)}
        className="p-1.5 bg-danger/10 hover:bg-danger/20 rounded-full text-danger transition-colors"
        title="Supprimer le crédit"
      >
        <Trash2 size={16} />
      </button>
    </div>
  ) : null;

  if (loading) {
    return (
      <>
        <HeaderTitle>Chargement...</HeaderTitle>
        <HeaderBackButton to="/accounts" />
        <div className="space-y-6 mt-4 mb-6 animate-pulse">
          {/* Main Card Skeleton */}
          <div className="h-48 bg-surface-2 rounded-[28px] border border-border/40" />
          {/* Secondary Details Skeleton */}
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-surface-2 rounded-2xl border border-border/40" />
            <div className="h-24 bg-surface-2 rounded-2xl border border-border/40" />
          </div>
          {/* Schedule Skeleton */}
          <div className="h-32 bg-surface-2 rounded-2xl border border-border/40" />
          {/* History Skeleton */}
          <div className="h-48 bg-surface-2 rounded-2xl border border-border/40" />
        </div>
      </>
    );
  }

  if (!summary) return null;

  const historyToShow = showAllHistory 
    ? summary.paymentsHistory 
    : summary.paymentsHistory.slice(0, 5);

  // Next payment capital & interest parts decomposition (French Amortization estimation)
  const nextIntPart = summary.interestRate > 0 ? (summary.capitalRemaining * (summary.interestRate / 100 / 12)) : 0;
  const nextPriPart = Math.max(0, summary.nextPaymentAmount - nextIntPart);

  return (
    <>
      <HeaderTitle>{summary.accountName}</HeaderTitle>
      <HeaderBackButton to="/accounts" />
      <HeaderActions>{actions}</HeaderActions>

      <motion.div 
        initial={{ x: '30px', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="space-y-6 mb-6 mt-2"
      >
        {/* Main Capital Overview Card */}
        <div className="bg-surface-2 border border-border/40 p-6 rounded-[28px] shadow-sm relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Capital Initial</p>
              <p className="text-sm font-bold text-primary mt-1 font-premium-numbers">{formatCurrency(summary.initialAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Capital Remboursé</p>
              <p className="text-sm font-bold text-accent mt-1 font-premium-numbers">{formatCurrency(summary.capitalPaid)}</p>
            </div>
          </div>

          <div className="border-t border-border/20 pt-4 mb-4">
            <p className="text-xs text-secondary font-bold uppercase tracking-wide">Capital Restant Dû</p>
            <h2 className="text-3xl font-extrabold text-danger font-premium-numbers tracking-tight mt-1" style={{ color: 'var(--danger)' }}>
              {formatCurrency(summary.currentBalance)}
            </h2>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-surface border border-border/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${summary.progressPercentage}%`, backgroundColor: '#10b981' }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-secondary font-bold">
              <span>{summary.progressPercentage}% remboursé</span>
              <span className="text-muted">cible: {formatCurrency(summary.initialAmount)}</span>
            </div>
          </div>
        </div>

        {/* Credit Evolution Chart */}
        <div className="bg-surface-2 border border-border/40 p-5 rounded-[24px] shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase flex items-center gap-1.5">
              <TrendingUp size={14} className="text-accent" /> Évolution du Solde
            </h3>
            <p className="text-[10px] text-muted">Suivi historique et projection prévisionnelle du capital restant dû.</p>
          </div>

          <div className="w-full h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={generateChartData()} 
                margin={{ left: -20, right: 5, top: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(1, Math.floor(generateChartData().length / 6))}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                />
                <Tooltip 
                  wrapperStyle={{ pointerEvents: 'none' }}
                  formatter={(val) => [formatCurrency(val), 'Capital restant']}
                  labelFormatter={(lbl, items) => {
                    const item = items[0]?.payload;
                    return `Échéance : ${lbl} (${item?.type || ''})`;
                  }}
                  contentStyle={{
                    borderRadius: '16px',
                    background: 'rgba(10, 10, 12, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Small Widgets Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-2 border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Intérêts Payés</span>
              <div className="p-1 rounded bg-danger/10 text-danger text-[10px]"><ArrowUpRight size={12} /></div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-primary font-premium-numbers">{formatCurrency(summary.totalInterestPaid)}</p>
              <p className="text-[9px] text-muted mt-0.5">est. restants : {formatCurrency(Math.max(0, summary.totalInterestEstimated - summary.totalInterestPaid))}</p>
            </div>
          </div>

          <div className="bg-surface-2 border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Taux & Durée</span>
              <div className="p-1 rounded bg-accent/10 text-accent text-[10px]"><Percent size={12} /></div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-primary font-premium-numbers">{summary.interestRate}%</p>
              <p className="text-[9px] text-muted mt-0.5">{summary.monthsRemaining} mois restants</p>
            </div>
          </div>
        </div>

        {/* Next Payment Card */}
        {summary.nextPaymentDate && (
          <div className="bg-surface-2 border border-border/40 p-5 rounded-[24px] shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-accent" /> Prochaine Échéance
            </h3>
            <div className="flex justify-between items-center bg-surface/50 border border-border/20 p-4 rounded-xl">
              <div>
                <p className="text-xs font-bold text-primary">
                  {new Date(summary.nextPaymentDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-muted mt-0.5">Automatique (Confirmation auto)</p>
              </div>
              <span className="text-xl font-extrabold text-primary font-premium-numbers">{formatCurrency(summary.nextPaymentAmount)}</span>
            </div>
            
            {/* Decomposition */}
            <div className="grid grid-cols-2 gap-3 text-[10px] text-secondary font-semibold border-t border-border/20 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Capital : {formatCurrency(nextPriPart)}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                <span>Intérêts : {formatCurrency(nextIntPart)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payments History */}
        <div className="bg-surface-2 border border-border/40 p-5 rounded-[24px] shadow-sm">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4">
            Historique des Remboursements
          </h3>

          {summary.paymentsHistory.length === 0 ? (
            <div className="text-center py-6 text-muted text-xs">
              Aucun remboursement enregistré pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {historyToShow.map((pay) => (
                <div key={pay.transactionId} className="flex flex-col border-b border-border/20 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                        <Check size={12} />
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {new Date(pay.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary font-premium-numbers">{formatCurrency(pay.amount)}</span>
                  </div>
                  
                  {/* Part Details */}
                  <div className="flex justify-between items-center text-[9px] text-muted font-medium mt-1.5 px-8">
                    <span>├ Capital : <span className="font-semibold text-secondary">{formatCurrency(pay.principalPart)}</span></span>
                    <span>└ Intérêts : <span className="font-semibold text-secondary">{formatCurrency(pay.interestPart)}</span></span>
                  </div>
                  <div className="text-[9px] text-muted/60 text-right font-premium-numbers mt-0.5">
                    Solde après : {formatCurrency(pay.balanceAfter)}
                  </div>
                </div>
              ))}

              {summary.paymentsHistory.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="w-full text-center text-xs font-bold text-accent pt-2 hover:underline"
                >
                  {showAllHistory ? 'Voir moins' : `Voir tout (${summary.paymentsHistory.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <CreditAccountBottomSheet 
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        initialData={{
          _id: id,
          name: summary.accountName,
          color: summary.color || '#f87171',
          type: 'credit',
          balance: summary.currentBalance,
          creditDetails: {
            initialAmount: summary.initialAmount,
            interestRate: summary.interestRate,
            durationMonths: summary.durationMonths,
            startDate: summary.nextPaymentDate || new Date().toISOString(), // Fallback
            scheduledTransactionId: summary.scheduledTransactionId
          }
        }}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setIsDeleteConfirmOpen(false);
          await handleDelete(id);
        }}
        title="Supprimer le crédit"
        confirmText="Supprimer"
        type="danger"
      >
        <div className="text-xs text-secondary leading-relaxed space-y-2">
          <p>
            Êtes-vous sûr de vouloir supprimer le compte crédit <span className="font-bold text-primary">"{summary.accountName}"</span> ?
          </p>
          <p className="font-semibold text-danger">
            ATTENTION : Cela supprimera définitivement le compte, son historique, ainsi que l'échéancier de remboursement planifié associé. Cette action est irréversible.
          </p>
        </div>
      </ConfirmModal>
    </>
  );
};

export default CreditDetailPage;
