import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import AmountInput from '../ui/AmountInput';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import TagSelector from './TagSelector';

const TransactionFormSheet = ({ isOpen, onClose, onSuccess, defaultDate, transactionToEdit }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  
  // Custom sheets visibility states
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  
  const { accounts } = useAccounts();
  const { categoriesTree } = useCategories();
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactions();

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type || 'expense');
        setAmount(String(transactionToEdit.amount || ''));
        setAccountId(transactionToEdit.accountId?._id || transactionToEdit.accountId || '');
        setCategoryId(transactionToEdit.categoryId?._id || transactionToEdit.categoryId || '');
        setNote(transactionToEdit.note || '');
        setDate(transactionToEdit.date ? new Date(transactionToEdit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setSelectedTagIds(transactionToEdit.tags?.map(t => t._id || t) || []);
      } else {
        setType('expense');
        setAmount('');
        setNote('');
        setDate(defaultDate ? new Date(defaultDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setSelectedTagIds([]);
        if (accounts.length > 0 && !accountId) setAccountId(accounts[0]._id);
      }
    }
  }, [isOpen, accounts, defaultDate, transactionToEdit]);

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategoryId('');
  };

  const handleDelete = async () => {
    if (window.confirm('Supprimer cette transaction ?')) {
      try {
        await deleteTransaction(transactionToEdit._id);
        toast.success('Transaction supprimée');
        window.dispatchEvent(new CustomEvent('transaction-changed'));
        onClose();
      } catch (e) {
        toast.error('Erreur lors de la suppression');
      }
    }
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
        date: new Date(date),
        tags: selectedTagIds
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

  const selectedAccount = accounts.find(acc => acc._id === accountId);

  const findCategoryInTree = (catId) => {
    if (!catId) return null;
    for (const parent of availableCategories || []) {
      if (parent._id === catId) return parent;
      const child = parent.children?.find(c => c._id === catId);
      if (child) return child;
    }
    return null;
  };
  const selectedCategory = findCategoryInTree(categoryId);

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="flex flex-col h-full space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-primary">
              {transactionToEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </h2>
            <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
              <X size={20} className="text-secondary" />
            </button>
          </div>
          
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
          <AmountInput 
            value={amount}
            onChange={setAmount}
            type={type}
            autoFocus={isOpen}
          />

          {/* Account and Category Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="accountId-select" className="text-xs text-secondary font-medium mb-1.5 cursor-pointer">Compte</label>
              <button
                type="button"
                onClick={() => setIsAccountSheetOpen(true)}
                className="flex items-center justify-between bg-surface border border-border rounded-xl p-3.5 text-left text-xs font-bold text-primary active:scale-98 active:bg-white/[0.02] transition-all select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectedAccount ? (
                    <>
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: selectedAccount.color || 'var(--accent)' }}
                      />
                      <span className="truncate">{selectedAccount.name}</span>
                    </>
                  ) : (
                    <span className="text-muted font-normal">-- Choisir --</span>
                  )}
                </div>
                <span className="text-muted text-[10px] ml-1 shrink-0">▼</span>
              </button>
              <select 
                id="accountId-select"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="hidden"
              >
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>{acc.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col">
               <label htmlFor="categoryId-select" className="text-xs text-secondary font-medium mb-1.5 cursor-pointer">Catégorie</label>
               <button
                type="button"
                onClick={() => setIsCategorySheetOpen(true)}
                disabled={type === 'transfer'}
                className="flex items-center justify-between bg-surface border border-border rounded-xl p-3.5 text-left text-xs font-bold text-primary active:scale-98 active:bg-white/[0.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {type === 'transfer' ? (
                    <span className="text-muted font-normal">Non applicable</span>
                  ) : selectedCategory ? (
                    <>
                      <span>{selectedCategory.icon || '📁'}</span>
                      <span className="truncate">{selectedCategory.name}</span>
                    </>
                  ) : (
                    <span className="text-muted font-normal">-- Choisir --</span>
                  )}
                </div>
                {type !== 'transfer' && <span className="text-muted text-[10px] ml-1 shrink-0">▼</span>}
              </button>
              <select 
                id="categoryId-select"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="hidden"
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
              <label htmlFor="date-input" className="text-xs text-secondary font-medium mb-1">Date</label>
              <input
                id="date-input"
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
              <label htmlFor="note-input" className="text-xs text-secondary font-medium mb-1">Note (optionnel)</label>
              <input
                id="note-input"
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex: Resto avec amis..."
                className="bg-surface border border-border rounded-xl p-3 text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Tag Selector */}
          <TagSelector
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />

          {/* Action Button */}
          <div className="mt-auto pt-4">
            {transactionToEdit ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-4 rounded-2xl bg-danger/10 hover:bg-danger/15 text-danger font-bold transition-all shadow-sm active:scale-95"
                >
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className={`flex-[2] py-4 rounded-2xl text-white font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-md ${
                    type === 'expense' 
                      ? 'bg-danger hover:bg-danger/90 shadow-danger/20' 
                      : 'bg-accent hover:bg-accent/90 shadow-accent/20'
                  }`}
                >
                  Enregistrer
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={`w-full py-4 rounded-2xl text-white font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-md ${
                  type === 'expense' 
                    ? 'bg-danger hover:bg-danger/90 shadow-danger/20' 
                    : 'bg-accent hover:bg-accent/90 shadow-accent/20'
                }`}
              >
                Ajouter la transaction
              </button>
            )}
          </div>

        </div>
      </BottomSheet>

      {/* Account Selection Bottom Sheet */}
      <BottomSheet isOpen={isAccountSheetOpen} onClose={() => setIsAccountSheetOpen(false)}>
        <div className="space-y-4">
          <div className="pb-2 border-b border-border/40">
            <h3 className="text-sm font-extrabold text-primary">Sélectionner un compte</h3>
            <p className="text-xs text-muted">Choisissez le compte pour cette transaction</p>
          </div>
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar py-1">
            {accounts.map(acc => {
              const isSelected = acc._id === accountId;
              return (
                <button
                  key={acc._id}
                  type="button"
                  onClick={() => {
                    setAccountId(acc._id);
                    setIsAccountSheetOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all text-left ${
                    isSelected 
                      ? 'bg-accent/10 border-accent text-primary' 
                      : 'bg-surface border-border/40 hover:bg-surface-2/80 active:scale-98'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/10" 
                      style={{ backgroundColor: acc.color || 'var(--accent)' }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs block text-primary">{acc.name}</span>
                      <span className="text-[10px] text-muted">{acc.type === 'credit' ? 'Carte de crédit' : 'Compte courant'}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-secondary">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: acc.currency || 'EUR' }).format(acc.balance)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Category Selection Bottom Sheet */}
      <BottomSheet isOpen={isCategorySheetOpen} onClose={() => setIsCategorySheetOpen(false)}>
        <div className="space-y-4">
          <div className="pb-2 border-b border-border/40">
            <h3 className="text-sm font-extrabold text-primary">Sélectionner une catégorie</h3>
            <p className="text-xs text-muted">Choisissez la catégorie pour cette transaction</p>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar py-1">
            {availableCategories?.map(parent => {
              const isParentSelected = parent._id === categoryId;
              return (
                <div key={parent._id} className="space-y-2">
                  {/* Parent category trigger / header card */}
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId(parent._id);
                      setIsCategorySheetOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                      isParentSelected 
                        ? 'bg-accent/15 border-accent text-primary' 
                        : 'bg-surface border-border/40 hover:bg-surface-2/85 active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{parent.icon || '📁'}</span>
                      <span className="font-bold text-xs text-primary truncate">{parent.name}</span>
                    </div>
                    {isParentSelected ? (
                      <span className="text-[10px] text-accent font-black">✓ Principal</span>
                    ) : (
                      <span className="text-[10px] text-muted font-semibold">Sélectionner &rarr;</span>
                    )}
                  </button>
                  
                  {/* Children / Subcategories grid */}
                  {parent.children && parent.children.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pl-3">
                      {parent.children.map(child => {
                        const isChildSelected = child._id === categoryId;
                        return (
                          <button
                            key={child._id}
                            type="button"
                            onClick={() => {
                              setCategoryId(child._id);
                              setIsCategorySheetOpen(false);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              isChildSelected 
                                ? 'bg-accent/10 border-accent/60 text-accent font-bold' 
                                : 'bg-surface-2/50 border-border/20 hover:border-border/40 active:scale-95'
                            }`}
                          >
                            <span className="text-sm shrink-0">{child.icon || parent.icon || '↳'}</span>
                            <span className="text-[11px] truncate text-primary">{child.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default TransactionFormSheet;
