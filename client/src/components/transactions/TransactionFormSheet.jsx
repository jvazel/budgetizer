import React, { useState, useEffect, useMemo, useRef } from 'react';
import BottomSheet from '../ui/BottomSheet';
import AmountInput from '../ui/AmountInput';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import toast from 'react-hot-toast';
import { X, Search, Star } from 'lucide-react';
import TagSelector from './TagSelector';
import { triggerHaptic } from '../../utils/hapticHelper';
import ConfirmModal from '../ui/ConfirmModal';

const DEFAULT_TEMPLATES = [
  { id: 't-cafe', name: 'Café', type: 'expense', amount: '2.50', note: 'Café', icon: '☕' },
  { id: 't-midi', name: 'Déjeuner', type: 'expense', amount: '15.00', note: 'Midi', icon: '🍔' },
  { id: 't-courses', name: 'Courses', type: 'expense', amount: '50.00', note: 'Courses', icon: '🛒' }
];

const TransactionFormSheet = ({ isOpen, onClose, onSuccess, defaultDate, transactionToEdit }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');

  // activePanel state: 'form' | 'account' | 'category'
  const [activePanel, setActivePanel] = useState('form');

  const [templates, setTemplates] = useState([]);

  const noteInputRef = useRef(null);

  const [glowAccount, setGlowAccount] = useState(false);
  const [glowCategory, setGlowCategory] = useState(false);

  const triggerGlow = (panelType) => {
    if (panelType === 'account') {
      setGlowAccount(true);
      setTimeout(() => setGlowAccount(false), 1000);
    }
    if (panelType === 'category') {
      setGlowCategory(true);
      setTimeout(() => setGlowCategory(false), 1000);
    }
  };

  const longPressTimers = useRef({});
  const longPressTriggered = useRef(false);

  const [confirmDeleteTemplateOpen, setConfirmDeleteTemplateOpen] = useState(false);
  const [templateToDeleteId, setTemplateToDeleteId] = useState(null);

  useEffect(() => {
    if (activePanel !== 'category') {
      setCategorySearch('');
    }
  }, [activePanel]);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('budgetizer_quick_templates');
      if (stored) {
        try {
          setTemplates(JSON.parse(stored));
        } catch (e) {
          setTemplates(DEFAULT_TEMPLATES);
        }
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }
    }
  }, [isOpen]);
  
  const { accounts } = useAccounts();
  const { categoriesTree } = useCategories();
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { transactions: recentTransactions } = useTransactions({ limit: 50 });

  // Helper to verify if category exists in current tree
  const catExists = (catId, checkType) => {
    const list = checkType === 'expense' ? categoriesTree?.expense : categoriesTree?.income;
    if (!list) return false;
    return list.some(parent => parent._id === catId || parent.children?.some(child => child._id === catId));
  };

  // Autocomplete suggestions based on recent transactions note matching
  const suggestions = useMemo(() => {
    if (!note || note.trim().length < 2 || transactionToEdit) return [];
    const cleanNote = note.toLowerCase().trim();
    
    const matches = (recentTransactions || []).filter(tx => 
      tx.note && tx.note.toLowerCase().includes(cleanNote)
    );

    const grouped = {};
    matches.forEach(tx => {
      const name = tx.note.trim();
      const catId = tx.categoryId?._id || tx.categoryId || '';
      const accId = tx.accountId?._id || tx.accountId || '';
      
      if (!grouped[name]) {
        grouped[name] = {
          name,
          icon: '⭐',
          categories: {},
          accounts: {},
          tags: {},
          count: 0
        };
      }
      
      grouped[name].count += 1;
      if (catId) {
        grouped[name].categories[catId] = (grouped[name].categories[catId] || 0) + 1;
      }
      if (accId) {
        grouped[name].accounts[accId] = (grouped[name].accounts[accId] || 0) + 1;
      }

      // Aggregate tags
      if (tx.tags && Array.isArray(tx.tags)) {
        tx.tags.forEach(tag => {
          const tagId = tag._id || tag;
          if (tagId) {
            grouped[name].tags[tagId] = (grouped[name].tags[tagId] || 0) + 1;
          }
        });
      }
      
      // Extract icon from category if populated
      const catIcon = tx.categoryId?.icon || 
                      categoriesTree?.expense?.find(p => p._id === catId)?.icon ||
                      categoriesTree?.expense?.flatMap(p => p.children || []).find(c => c._id === catId)?.icon ||
                      categoriesTree?.income?.find(p => p._id === catId)?.icon ||
                      categoriesTree?.income?.flatMap(p => p.children || []).find(c => c._id === catId)?.icon;
      if (catIcon) {
        grouped[name].icon = catIcon;
      }
    });

    return Object.values(grouped)
      .map(g => {
        const bestCat = Object.keys(g.categories).length
          ? Object.keys(g.categories).reduce((a, b) => g.categories[a] > g.categories[b] ? a : b)
          : null;
        const bestAcc = Object.keys(g.accounts).length
          ? Object.keys(g.accounts).reduce((a, b) => g.accounts[a] > g.accounts[b] ? a : b)
          : null;
        const associatedTags = Object.keys(g.tags).sort((a, b) => g.tags[b] - g.tags[a]);

        return {
          name: g.name,
          icon: g.icon,
          categoryId: bestCat,
          accountId: bestAcc,
          tags: associatedTags,
          count: g.count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [note, recentTransactions, categoriesTree, transactionToEdit]);

  useEffect(() => {
    if (isOpen) {
      setActivePanel('form');
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

        const lastAccountId = localStorage.getItem('budgetizer_last_account_id');
        if (lastAccountId && accounts.some(acc => acc._id === lastAccountId)) {
          setAccountId(lastAccountId);
        } else if (accounts.length > 0) {
          setAccountId(accounts[0]._id);
        }

        const lastCategoryId = localStorage.getItem('budgetizer_last_expense_category_id');
        if (lastCategoryId && catExists(lastCategoryId, 'expense')) {
          setCategoryId(lastCategoryId);
        } else {
          setCategoryId('');
        }
      }
    }
  }, [isOpen, accounts, categoriesTree, defaultDate, transactionToEdit]);

  const handleTypeChange = (newType) => {
    setType(newType);
    const lastCatKey = newType === 'expense' ? 'budgetizer_last_expense_category_id' : 'budgetizer_last_income_category_id';
    const lastCategoryId = localStorage.getItem(lastCatKey);
    if (lastCategoryId && catExists(lastCategoryId, newType)) {
      setCategoryId(lastCategoryId);
    } else {
      setCategoryId('');
    }
  };

  const handleAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      noteInputRef.current?.focus();
    }
  };

  const handleNoteKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleApplyTemplate = (t) => {
    triggerHaptic('light');
    setType(t.type || 'expense');
    setAmount(String(t.amount || ''));
    setNote(t.note || '');
    
    if (t.accountId && accounts.some(acc => acc._id === t.accountId)) {
      setAccountId(t.accountId);
      triggerGlow('account');
    }
    
    if (t.categoryId && catExists(t.categoryId, t.type || 'expense')) {
      setCategoryId(t.categoryId);
      triggerGlow('category');
    } else {
      setCategoryId('');
    }
  };

  const handleTemplatePressStart = (e, templateId) => {
    longPressTriggered.current = false;
    if (longPressTimers.current[templateId]) {
      clearTimeout(longPressTimers.current[templateId]);
    }
    
    longPressTimers.current[templateId] = setTimeout(() => {
      longPressTriggered.current = true;
      handleDeleteTemplate(templateId);
      longPressTimers.current[templateId] = null;
    }, 600);
  };

  const handleTemplatePressEnd = (templateId) => {
    if (longPressTimers.current[templateId]) {
      clearTimeout(longPressTimers.current[templateId]);
      longPressTimers.current[templateId] = null;
    }
  };

  const handleTemplateClick = (e, t) => {
    if (longPressTriggered.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressTriggered.current = false;
      return;
    }
    handleApplyTemplate(t);
  };

  const handleDeleteTemplate = (templateId) => {
    triggerHaptic('medium');
    setTemplateToDeleteId(templateId);
    setConfirmDeleteTemplateOpen(true);
  };

  const handleConfirmDeleteTemplate = () => {
    const templateId = templateToDeleteId;
    if (!templateId) return;
    const updated = templates.filter(t => t.id !== templateId);
    setTemplates(updated);
    localStorage.setItem('budgetizer_quick_templates', JSON.stringify(updated));
    setConfirmDeleteTemplateOpen(false);
    setTemplateToDeleteId(null);
    toast.success('Favori supprimé');
  };

  const handleApplySuggestion = (suggestion) => {
    triggerHaptic('light');
    setNote(suggestion.name);
    
    if (suggestion.accountId && accounts.some(acc => acc._id === suggestion.accountId)) {
      setAccountId(suggestion.accountId);
      triggerGlow('account');
    }
    
    if (suggestion.categoryId && catExists(suggestion.categoryId, type)) {
      setCategoryId(suggestion.categoryId);
      triggerGlow('category');
    }

    if (suggestion.tags && Array.isArray(suggestion.tags)) {
      setSelectedTagIds(suggestion.tags);
    } else {
      setSelectedTagIds([]);
    }
  };

  const handleNoteBlur = () => {
    if (!note) return;
    const exactMatch = suggestions.find(s => s.name.toLowerCase() === note.toLowerCase().trim());
    if (exactMatch) {
      if (exactMatch.accountId && accounts.some(acc => acc._id === exactMatch.accountId)) {
        setAccountId(exactMatch.accountId);
        triggerGlow('account');
      }
      if (exactMatch.categoryId && catExists(exactMatch.categoryId, type)) {
        setCategoryId(exactMatch.categoryId);
        triggerGlow('category');
      }
      if (exactMatch.tags && Array.isArray(exactMatch.tags)) {
        setSelectedTagIds(exactMatch.tags);
      }
    }
  };

  const handleSaveAsTemplate = () => {
    triggerHaptic('light');
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Veuillez saisir un montant pour créer un favori');
      return;
    }
    const name = window.prompt('Nom du favori (ex: Café du matin) :');
    if (!name || !name.trim()) return;

    let icon = '⭐';
    if (categoryId) {
      const cat = categoriesTree?.expense?.find(p => p._id === categoryId) ||
                  categoriesTree?.expense?.flatMap(p => p.children || []).find(c => c._id === categoryId) ||
                  categoriesTree?.income?.find(p => p._id === categoryId) ||
                  categoriesTree?.income?.flatMap(p => p.children || []).find(c => c._id === categoryId);
      if (cat?.icon) icon = cat.icon;
    }

    const newTemplate = {
      id: 'template-' + Date.now(),
      name: name.trim(),
      type,
      amount,
      accountId,
      categoryId,
      note,
      icon
    };

    const updated = [newTemplate, ...templates].slice(0, 10);
    setTemplates(updated);
    localStorage.setItem('budgetizer_quick_templates', JSON.stringify(updated));
    toast.success('Favori enregistré !');
  };

  const handleSaveEditAsTemplate = () => {
    triggerHaptic('light');
    const name = window.prompt('Nom du favori (ex: Courses Hebdo) :', note || 'Favori');
    if (!name || !name.trim()) return;

    let icon = '⭐';
    if (categoryId) {
      const cat = categoriesTree?.expense?.find(p => p._id === categoryId) ||
                  categoriesTree?.expense?.flatMap(p => p.children || []).find(c => c._id === categoryId) ||
                  categoriesTree?.income?.find(p => p._id === categoryId) ||
                  categoriesTree?.income?.flatMap(p => p.children || []).find(c => c._id === categoryId);
      if (cat?.icon) icon = cat.icon;
    }

    const newTemplate = {
      id: 'template-' + Date.now(),
      name: name.trim(),
      type,
      amount,
      accountId,
      categoryId,
      note,
      icon
    };

    const stored = localStorage.getItem('budgetizer_quick_templates');
    let currentTemplates = DEFAULT_TEMPLATES;
    if (stored) {
      try { currentTemplates = JSON.parse(stored); } catch (e) {}
    }
    const updated = [newTemplate, ...currentTemplates].slice(0, 10);
    setTemplates(updated);
    localStorage.setItem('budgetizer_quick_templates', JSON.stringify(updated));
    toast.success('Favori enregistré !');
  };

  const handleDelete = async () => {
    if (window.confirm('Supprimer cette transaction ?')) {
      try {
        await deleteTransaction(transactionToEdit._id);
        triggerHaptic('medium');
        toast.success('Transaction supprimée');
        window.dispatchEvent(new CustomEvent('transaction-changed'));
        onClose();
      } catch (e) {
        triggerHaptic('error');
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      triggerHaptic('error');
      toast.error('Montant invalide');
      return;
    }
    if (!accountId) {
      triggerHaptic('error');
      toast.error('Sélectionnez un compte');
      return;
    }
    if (!categoryId && type !== 'transfer') {
      triggerHaptic('error');
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
        triggerHaptic('medium');
        toast.success('Transaction modifiée');
      } else {
        await addTransaction(payload);
        triggerHaptic('medium');
        toast.success('Transaction ajoutée');
      }

      // Save smart defaults in localStorage
      localStorage.setItem('budgetizer_last_account_id', accountId);
      if (categoryId) {
        if (type === 'expense') {
          localStorage.setItem('budgetizer_last_expense_category_id', categoryId);
        } else if (type === 'income') {
          localStorage.setItem('budgetizer_last_income_category_id', categoryId);
        }
      }

      window.dispatchEvent(new CustomEvent('transaction-changed'));
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      triggerHaptic('error');
      toast.error(transactionToEdit ? "Erreur lors de la modification" : "Erreur lors de l'ajout");
    }
  };

  const availableCategories = type === 'expense' ? categoriesTree.expense : categoriesTree.income;

  const filteredAvailableCategories = useMemo(() => {
    if (!availableCategories) return [];
    if (!categorySearch.trim()) return availableCategories;
    const cleanSearch = categorySearch.toLowerCase().trim();
    
    return availableCategories.map(parent => {
      const parentMatches = parent.name.toLowerCase().includes(cleanSearch);
      const filteredChildren = parent.children?.filter(child => 
        child.name.toLowerCase().includes(cleanSearch)
      ) || [];
      
      if (parentMatches || filteredChildren.length > 0) {
        return {
          ...parent,
          children: parentMatches ? parent.children : filteredChildren
        };
      }
      return null;
    }).filter(Boolean);
  }, [availableCategories, categorySearch]);

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
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        
        {/* PANEL 1: MAIN FORM */}
        {activePanel === 'form' && (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-primary">
                {transactionToEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}
              </h2>
              <div className="flex items-center gap-2">
                {transactionToEdit && (
                  <button 
                    type="button" 
                    onClick={handleSaveEditAsTemplate} 
                    className="p-1.5 rounded-xl bg-surface-2 hover:bg-border/60 transition-colors text-amber-400 hover:text-amber-500"
                    title="Enregistrer cette transaction comme favori"
                  >
                    <Star size={16} fill="currentColor" />
                  </button>
                )}
                <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
                  <X size={20} className="text-secondary" />
                </button>
              </div>
            </div>

            {/* Quick Templates Banner */}
            {!transactionToEdit && templates.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 select-none w-full max-w-sm mx-auto mb-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={(e) => handleTemplatePressStart(e, t.id)}
                    onMouseUp={() => handleTemplatePressEnd(t.id)}
                    onMouseLeave={() => handleTemplatePressEnd(t.id)}
                    onTouchStart={(e) => handleTemplatePressStart(e, t.id)}
                    onTouchEnd={() => handleTemplatePressEnd(t.id)}
                    onClick={(e) => handleTemplateClick(e, t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-border/30 border border-border/20 active:scale-95 transition-all text-xs font-medium text-secondary hover:text-primary shrink-0 select-none"
                  >
                    <span>{t.icon || '⭐'}</span>
                    <span className="font-bold">{t.name}</span>
                    <span className="text-[10px] text-muted font-bold font-premium-numbers">{t.amount}€</span>
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/5 border border-accent/20 hover:bg-accent/10 hover:border-accent/40 active:scale-95 transition-all text-xs font-bold text-accent shrink-0"
                >
                  <span>+ Sauvegarder</span>
                </button>
              </div>
            )}
            
            {/* Type Selector */}
            <div className="flex bg-surface p-1 rounded-2xl mx-auto w-full max-w-sm shadow-sm">
              <button 
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${type === 'expense' ? 'bg-danger text-white shadow-sm' : 'text-muted'}`}
              >
                Dépense
              </button>
              <button 
                type="button"
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
              autoFocus={isOpen && activePanel === 'form'}
              onKeyDown={handleAmountKeyDown}
            />

            {/* Account and Category Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label htmlFor="account-select" className="text-xs text-secondary font-medium mb-1.5 select-none">Compte</label>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActivePanel('account');
                  }}
                  className={`flex items-center justify-between bg-surface border border-border rounded-xl p-3.5 text-left text-xs font-bold text-primary active:scale-98 active:bg-white/[0.02] transition-all select-none ${glowAccount ? 'animate-glow-prediction' : ''}`}
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
                  id="account-select"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="sr-only"
                  style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
                >
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col">
                 <label htmlFor="category-select" className="text-xs text-secondary font-medium mb-1.5 select-none">Catégorie</label>
                 <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActivePanel('category');
                  }}
                  disabled={type === 'transfer'}
                  className={`flex items-center justify-between bg-surface border border-border rounded-xl p-3.5 text-left text-xs font-bold text-primary active:scale-98 active:bg-white/[0.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none ${glowCategory ? 'animate-glow-prediction' : ''}`}
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
                  id="category-select"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="sr-only"
                  disabled={type === 'transfer'}
                  style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
                >
                  <option value="">-- Choisir --</option>
                  {availableCategories?.map(parent => (
                    <React.Fragment key={parent._id}>
                      <option value={parent._id}>{parent.name}</option>
                      {parent.children?.map(child => (
                        <option key={child._id} value={child._id}>&nbsp;&nbsp;{child.name}</option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>
            </div>

            {/* Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 select-none w-full max-w-sm mx-auto mb-2 animate-fadeIn">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySuggestion(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/5 hover:bg-accent/10 border border-accent/25 active:scale-95 transition-all text-xs font-bold text-secondary hover:text-primary shrink-0 select-none"
                  >
                    <span>{s.icon}</span>
                    <span className="font-bold">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

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
                  ref={noteInputRef}
                  id="note-input"
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  onBlur={handleNoteBlur}
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

            {/* Action Buttons */}
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
          </>
        )}

        {/* PANEL 2: SELECT ACCOUNT */}
        {activePanel === 'account' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="pb-2 border-b border-border/40 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-primary">Sélectionner un compte</h3>
                <p className="text-xs text-muted font-medium mt-0.5">Choisissez le compte de débit/crédit</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActivePanel('form');
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-2 text-xs font-bold hover:bg-border/60 text-secondary"
              >
                Retour
              </button>
            </div>
            
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar py-1">
              {accounts.map(acc => {
                const isSelected = acc._id === accountId;
                return (
                  <button
                    key={acc._id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setAccountId(acc._id);
                      setActivePanel('form');
                    }}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all text-left ${
                      isSelected 
                        ? 'bg-accent/10 border-accent text-primary font-bold' 
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
                        <span className="text-[10px] text-muted">
                          {acc.type === 'checking' ? 'Compte courant' :
                           acc.type === 'savings' ? 'Épargne' :
                           acc.type === 'credit' ? 'Carte de crédit' :
                           acc.type === 'cash' ? 'Espèces' : 'Investissement'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-secondary font-premium-numbers">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: acc.currency || 'EUR' }).format(acc.balance)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PANEL 3: SELECT CATEGORY */}
        {activePanel === 'category' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="pb-2 border-b border-border/40 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-primary">Sélectionner une catégorie</h3>
                <p className="text-xs text-muted font-medium mt-0.5">Choisissez la catégorie pour cette transaction</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActivePanel('form');
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-2 text-xs font-bold hover:bg-border/60 text-secondary"
              >
                Retour
              </button>
            </div>
            
            {/* Search bar inside sheet */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Rechercher une catégorie..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-xs text-primary focus:outline-none focus:border-accent placeholder-muted"
              />
            </div>

            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1 no-scrollbar py-1">
              {filteredAvailableCategories.length === 0 ? (
                <p className="text-xs text-muted italic text-center py-4">Aucune catégorie trouvée</p>
              ) : (
                filteredAvailableCategories.map(parent => {
                  const isParentSelected = parent._id === categoryId;
                  return (
                    <div key={parent._id} className="space-y-2">
                      {/* Parent category trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setCategoryId(parent._id);
                          setActivePanel('form');
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
                          <span className="text-[10px] text-secondary/70 font-semibold">Choisir &rarr;</span>
                        )}
                      </button>
                      
                      {/* Children Subcategories */}
                      {parent.children && parent.children.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pl-3">
                          {parent.children.map(child => {
                            const isChildSelected = child._id === categoryId;
                            return (
                              <button
                                key={child._id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCategoryId(child._id);
                                  setActivePanel('form');
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
                })
              )}
            </div>
          </div>
        )}

      </div>

      <ConfirmModal
        isOpen={confirmDeleteTemplateOpen}
        onClose={() => setConfirmDeleteTemplateOpen(false)}
        onConfirm={handleConfirmDeleteTemplate}
        title="Supprimer le favori"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      >
        <p className="text-xs text-secondary leading-relaxed">
          Êtes-vous sûr de vouloir supprimer le favori{" "}
          <strong className="text-primary font-bold">
            "{templates.find(t => t.id === templateToDeleteId)?.name || ''}"
          </strong>{" "}
          ? Cette action est irréversible.
        </p>
      </ConfirmModal>
    </BottomSheet>
  );
};

export default TransactionFormSheet;
