import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import NumericKeypad from '../ui/NumericKeypad';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import toast from 'react-hot-toast';

const TransactionFormSheet = ({ isOpen, onClose, onSuccess, defaultDate, transactionToEdit }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { accounts } = useAccounts();
  const { categoriesTree } = useCategories();
  const { addTransaction, updateTransaction } = useTransactions();

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type || 'expense');
        setAmount(String(transactionToEdit.amount || ''));
        setAccountId(transactionToEdit.accountId?._id || transactionToEdit.accountId || '');
        setCategoryId(transactionToEdit.categoryId?._id || transactionToEdit.categoryId || '');
        setNote(transactionToEdit.note || '');
        setDate(transactionToEdit.date ? new Date(transactionToEdit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      } else {
        setType('expense');
        setAmount('');
        setNote('');
        setDate(defaultDate ? new Date(defaultDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        if (accounts.length > 0 && !accountId) setAccountId(accounts[0]._id);
      }
    }
  }, [isOpen, accounts, defaultDate, transactionToEdit]);

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategoryId('');
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!accountId) {
      toast.error('Sélectionnez un compte');
      return;
    }
    if (!categoryId && type !== 'transfer') {
      toast.error('Sélectionnez une catégorie');
      return;
    }

    try {
      const payload = {
        type,
        amount: parseFloat(amount),
        accountId,
        categoryId: categoryId || null,
        note,
        date: new Date(date)
      };

      if (transactionToEdit) {
        await updateTransaction(transactionToEdit._id, payload);
        toast.success('Transaction modifiée');
      } else {
        await addTransaction(payload);
        toast.success('Transaction ajoutée');
      }
      window.dispatchEvent(new CustomEvent('transaction-changed'));
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      toast.error(transactionToEdit ? "Erreur lors de la modification" : "Erreur lors de l'ajout");
    }
  };

  const availableCategories = type === 'expense' ? categoriesTree.expense : categoriesTree.income;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full space-y-6">
        
        {/* Type Selector */}
        <div className="flex bg-surface p-1 rounded-2xl mx-auto w-full max-w-sm shadow-sm">
          <button 
            onClick={() => handleTypeChange('expense')}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${type === 'expense' ? 'bg-danger text-white shadow-sm' : 'text-muted'}`}
          >
            Dépense
          </button>
          <button 
            onClick={() => handleTypeChange('income')}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${type === 'income' ? 'bg-accent text-white shadow-sm' : 'text-muted'}`}
          >
            Revenu
          </button>
        </div>

        {/* Amount Display */}
        <div className="flex flex-col items-center justify-center py-4">
          <span className={`font-mono text-5xl font-bold tracking-tight ${type === 'expense' ? 'text-danger' : 'text-accent'}`}>
            {type === 'expense' ? '-' : '+'}{amount || '0'} €
          </span>
        </div>

        {/* Account and Category Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-secondary font-medium mb-1">Compte</label>
            <select 
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="bg-surface border border-border rounded-xl p-3 text-primary focus:outline-none"
            >
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>{acc.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col">
             <label className="text-xs text-secondary font-medium mb-1">Catégorie</label>
             <select 
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="bg-surface border border-border rounded-xl p-3 text-primary focus:outline-none"
            >
              <option value="">-- Choisir --</option>
              {availableCategories?.map(parent => (
                <optgroup key={parent._id} label={`${parent.icon} ${parent.name}`}>
                  <option value={parent._id}>{parent.name}</option>
                  {parent.children?.map(child => (
                    <option key={child._id} value={child._id}>↳ {child.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Date and Note Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-secondary font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (err) {}
              }}
              className="bg-surface border border-border rounded-xl p-3 text-primary focus:outline-none focus:border-accent w-full"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-secondary font-medium mb-1">Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: Resto avec amis..."
              className="bg-surface border border-border rounded-xl p-3 text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Keypad */}
        <div className="mt-auto pt-4">
          <NumericKeypad 
            value={amount} 
            onChange={setAmount} 
            onSubmit={handleSubmit}
            onToggleSign={() => handleTypeChange(type === 'expense' ? 'income' : 'expense')}
          />
        </div>

      </div>
    </BottomSheet>
  );
};

export default TransactionFormSheet;
