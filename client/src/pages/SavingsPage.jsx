import React, { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import SavingsGoalCard from '../components/savings/SavingsGoalCard';
import SavingsGoalFormSheet from '../components/savings/SavingsGoalFormSheet';
import SavingsActionFormSheet from '../components/savings/SavingsActionFormSheet';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { Plus, PiggyBank, Target, HelpCircle } from 'lucide-react';

const SavingsPage = () => {
  const {
    savingsGoals,
    loading,
    error,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    fetchSavingsGoals
  } = useSavingsGoals();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [actionType, setActionType] = useState('deposit'); // 'deposit' or 'withdraw'

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleOpenDeposit = (goal) => {
    setSelectedGoal(goal);
    setActionType('deposit');
    setIsActionOpen(true);
  };

  const handleOpenWithdraw = (goal) => {
    setSelectedGoal(goal);
    setActionType('withdraw');
    setIsActionOpen(true);
  };

  // Calculations for total progress
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallPercentage = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const roundedOverallPct = Math.round(overallPercentage);
  const cappedOverallPct = Math.min(overallPercentage, 100);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const showSkeleton = loading && savingsGoals.length === 0;

  return (
    <AppShell title="Objectifs d'épargne" backTo="/">
      <div className="pb-24 px-1">
        
        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl mb-6 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Global Progress Header Widget */}
        {savingsGoals.length > 0 && !showSkeleton && (
          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm mb-6 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
                  <PiggyBank size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Épargne Globale</h4>
                  <p className="text-[10px] text-secondary font-semibold mt-0.5">Cumul de tous vos objectifs</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-mono font-extrabold text-accent">{formatCurrency(totalSaved)}</span>
                <p className="text-[10px] text-muted font-bold mt-0.5">sur {formatCurrency(totalTarget)}</p>
              </div>
            </div>

            <div className="h-3 w-full bg-surface border border-border/30 rounded-lg overflow-hidden relative">
              <div
                className="h-full bg-accent rounded-lg transition-all duration-700 ease-out"
                style={{ width: `${cappedOverallPct}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center mt-2.5 text-[10px] font-bold text-secondary">
              <span>Progression totale</span>
              <span className="text-accent font-mono font-extrabold">{roundedOverallPct}%</span>
            </div>
          </div>
        )}

        {/* Goals List / Empty State */}
        {showSkeleton ? (
          <div className="space-y-4">
            <div className="h-[180px] bg-surface-2/60 rounded-[28px] animate-pulse border border-border/20" />
            <div className="h-[180px] bg-surface-2/60 rounded-[28px] animate-pulse border border-border/20" />
          </div>
        ) : savingsGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-surface-2/20 rounded-[28px] border border-dashed border-border/60">
            <div className="w-16 h-16 rounded-full bg-surface-3 border border-border/40 flex items-center justify-center text-accent mb-4 shadow-inner">
              <Target size={28} />
            </div>
            <h3 className="text-sm font-bold text-primary mb-1">Aucun objectif d'épargne</h3>
            <p className="text-xs text-muted max-w-[240px] leading-relaxed mb-6">
              Définissez vos projets (achat, voyage, fonds de secours) et commencez à épargner intelligemment.
            </p>
            <button
              onClick={handleOpenAdd}
              className="py-3 px-6 bg-accent text-white font-bold text-xs rounded-2xl shadow-[0_8px_16px_rgba(74,222,128,0.25)] hover:brightness-110 active:scale-95 transition-all"
            >
              Créer mon premier objectif
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {savingsGoals.map(goal => (
              <SavingsGoalCard
                key={goal._id}
                goal={goal}
                onEdit={handleOpenEdit}
                onDelete={deleteSavingsGoal}
                onDeposit={handleOpenDeposit}
                onWithdraw={handleOpenWithdraw}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleOpenAdd}
        className="fixed bottom-[88px] right-6 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all z-20"
        title="Ajouter un objectif d'épargne"
      >
        <Plus size={28} />
      </button>

      {/* Form Sheet (Create/Edit Goal) */}
      <SavingsGoalFormSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data) => {
          if (editingGoal) {
            await updateSavingsGoal(editingGoal._id, data);
          } else {
            await addSavingsGoal(data);
          }
          fetchSavingsGoals();
        }}
        onDelete={deleteSavingsGoal}
        initialData={editingGoal}
      />

      {/* Action Sheet (Deposit/Withdraw Money) */}
      <SavingsActionFormSheet
        isOpen={isActionOpen}
        onClose={() => setIsActionOpen(false)}
        goal={selectedGoal}
        actionType={actionType}
        onSuccess={fetchSavingsGoals}
      />
    </AppShell>
  );
};

export default SavingsPage;
