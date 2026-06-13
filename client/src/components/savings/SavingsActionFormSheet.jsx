import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const SavingsActionFormSheet = ({ isOpen, onClose, goal, actionType, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const { accounts } = useAccounts();
  const { categoriesTree } = useCategories();

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      
      if (accounts.length > 0) {
        const goalAccId = goal?.accountId?._id || goal?.accountId;
        // Filter out the goal's own account if it's a transfer
        const selectableAccounts = goalAccId 
          ? accounts.filter(a => a._id !== goalAccId)
          : accounts;

        // Try to select the first checking or cash account by default, or just the first selectable account
        const defaultAcc = selectableAccounts.find(a => a.type === 'checking' || a.type === 'cash') || selectableAccounts[0];
        setAccountId(defaultAcc ? defaultAcc._id : '');
      }
    }
  }, [isOpen, accounts, goal]);

  useEffect(() => {
    if (isOpen && goal && categoriesTree) {
      // Find a category related to savings
      const list = actionType === 'deposit' ? categoriesTree.expense : categoriesTree.income;
      if (list && list.length > 0) {
        const found = list.find(c => c.name.toLowerCase().includes('épargne') || c.name.toLowerCase().includes('savings'));
        if (found) {
          setCategoryId(found._id);
        } else {
          setCategoryId('');
        }
      }
    }
  }, [isOpen, goal, categoriesTree, actionType]);

  if (!goal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      return toast.error('Veuillez saisir un montant valide');
    }
    if (!accountId) {
      return toast.error('Veuillez sélectionner un compte');
    }

    try {
      const isDeposit = actionType === 'deposit';
      const goalAccId = goal.accountId?._id || goal.accountId;

      let payload;
      if (goalAccId) {
        payload = {
          accountId: isDeposit ? accountId : goalAccId,
          toAccountId: isDeposit ? goalAccId : accountId,
          type: 'transfer',
          amount: parseFloat(amount),
          description: isDeposit ? `Épargne : ${goal.name}` : `Retrait épargne : ${goal.name}`,
          date: new Date(date).toISOString(),
          note: note.trim(),
          savingsGoalId: goal._id
        };
      } else {
        payload = {
          accountId,
          categoryId: categoryId || null,
          type: isDeposit ? 'expense' : 'income',
          amount: parseFloat(amount),
          description: isDeposit ? `Épargne : ${goal.name}` : `Retrait épargne : ${goal.name}`,
          date: new Date(date).toISOString(),
          note: note.trim(),
          savingsGoalId: goal._id
        };
      }

      await api.post('/transactions', payload);
      toast.success(isDeposit ? 'Versement enregistré' : 'Retrait enregistré');
      
      // Dispatch events to notify other components
      window.dispatchEvent(new CustomEvent('transaction-changed'));
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'opération');
    }
  };

  const isDeposit = actionType === 'deposit';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span>{goal.icon}</span>
            <span>{isDeposit ? 'Ajouter de l\'épargne' : 'Retirer de l\'épargne'}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">
            Objectif : <strong className="text-primary">{goal.name}</strong>
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors shrink-0">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="mb-2 text-sm text-secondary font-medium block">
            Montant à {isDeposit ? 'verser' : 'retirer'} (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary font-mono text-xl focus:outline-none focus:border-accent"
            placeholder="0.00"
            required
            autoFocus
          />
        </div>

        {/* Account Selection */}
        <Select 
          label={
            goal.accountId ? (
              isDeposit 
                ? `Débiter du compte d'origine` 
                : `Créditer sur le compte de destination`
            ) : (
              isDeposit ? 'Débiter du compte' : 'Créditer sur le compte'
            )
          }
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          required
        >
          <option value="">-- Sélectionner un compte --</option>
          {accounts
            .filter(acc => !goal.accountId || (acc._id !== (goal.accountId._id || goal.accountId)))
            .map(acc => (
              <option key={acc._id} value={acc._id}>
                {acc.name} ({new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(acc.balance)})
              </option>
            ))}
        </Select>
        {goal.accountId && (
          <span className="text-[10px] text-muted mt-1 leading-normal block px-1">
            {isDeposit ? (
              <>Le versement sera crédité sur le compte lié à cet objectif : <strong>{goal.accountId.name || 'Compte associé'}</strong></>
            ) : (
              <>Le retrait sera débité du compte lié à cet objectif : <strong>{goal.accountId.name || 'Compte associé'}</strong></>
            )}
          </span>
        )}

        {/* Optional Category */}
        {!goal.accountId && (
          <Select 
            label="Catégorie (optionnel)"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">-- Aucune catégorie --</option>
            {(isDeposit ? categoriesTree.expense : categoriesTree.income)?.map(parent => (
              <optgroup key={parent._id} label={`${parent.icon} ${parent.name}`}>
                <option value={parent._id}>{parent.name}</option>
                {parent.children?.map(child => (
                  <option key={child._id} value={child._id}>↳ {child.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        )}

        {/* Date and Note */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 text-sm text-secondary font-medium block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (err) {}
              }}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-2 text-sm text-secondary font-medium block">Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none"
              placeholder="Note..."
            />
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" fullWidth variant={isDeposit ? 'primary' : 'secondary'}>
            {isDeposit ? 'Confirmer le versement' : 'Confirmer le retrait'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};

export default SavingsActionFormSheet;
