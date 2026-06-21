import React, { useState, useEffect, useMemo, useRef } from 'react';
import BottomSheet from '../ui/BottomSheet';
import AmountInput from '../ui/AmountInput';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import toast from 'react-hot-toast';
import { X, Search, Star, ChevronDown, RotateCcw } from 'lucide-react';
import TagSelector from './TagSelector';
import { triggerHaptic } from '../../utils/hapticHelper';
import ConfirmModal from '../ui/ConfirmModal';

const formatCurrencyShort = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formStep, setFormStep] = useState(1);

  // activePanel state: 'form' | 'account' | 'category'
  const [activePanel, setActivePanel] = useState('form');

  const [templates, setTemplates] = useState([]);
  const [lastTransaction, setLastTransaction] = useState(null);

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
  const { budgets } = useBudgets();

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
      setFormStep(transactionToEdit ? 2 : 1);
      setShowDatePicker(false);
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

        // Load last transaction for "Répéter" chip
        const storedLast = localStorage.getItem('budgetizer_last_transaction');
        if (storedLast) {
          try { setLastTransaction(JSON.parse(storedLast)); } catch (e) { setLastTransaction(null); }
        } else {
          setLastTransaction(null);
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
        onClose();
      } catch (e) {
        triggerHaptic('error');
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleRepeatLast = () => {
    if (!lastTransaction) return;
    triggerHaptic('light');
    setType(lastTransaction.type || 'expense');
    setAmount(String(lastTransaction.amount || ''));
    setNote(lastTransaction.note || '');
    if (lastTransaction.accountId && accounts.some(acc => acc._id === lastTransaction.accountId)) {
      setAccountId(lastTransaction.accountId);
      triggerGlow('account');
    }
    if (lastTransaction.categoryId && catExists(lastTransaction.categoryId, lastTransaction.type || 'expense')) {
      setCategoryId(lastTransaction.categoryId);
      triggerGlow('category');
    }
    if (lastTransaction.tags && Array.isArray(lastTransaction.tags)) {
      setSelectedTagIds(lastTransaction.tags);
    }
  };

  // (12) Calcul du solde résultant à la volée
  const projectedBalance = useMemo(() => {
    const acc = accounts.find(a => a._id === accountId);
    if (!acc || !amount || parseFloat(amount) <= 0) return null;
    const delta = type === 'expense' ? -parseFloat(amount) : parseFloat(amount);
    return { balance: acc.balance + delta, name: acc.name, positive: delta > 0 };
  }, [accounts, accountId, amount, type]);

  // (11) Budget actif pour la catégorie sélectionnée
  const activeBudget = useMemo(() => {
    if (!categoryId || !budgets || budgets.length === 0) return null;
    return budgets.find(b => {
      const bCatId = b.categoryId?._id || b.categoryId;
      return bCatId === categoryId;
    }) || null;
  }, [categoryId, budgets]);

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
        triggerHaptic(type === 'expense' ? 'expense' : 'income');
        toast.success('Transaction modifiée');
      } else {
        await addTransaction(payload);
        triggerHaptic(type === 'expense' ? 'expense' : 'income');

        // Toast enrichi : affiche le solde résultant
        const acc = accounts.find(a => a._id === accountId);
        if (acc) {
          const delta = type === 'expense' ? -parseFloat(amount) : parseFloat(amount);
          const newBalance = acc.balance + delta;
          toast.success(
            <div>
              <span className="font-bold">{type === 'expense' ? '−' : '+'}{formatCurrencyShort(parseFloat(amount))}</span> enregistré
              <span className="block text-xs text-white/70 mt-0.5">Solde {acc.name} : <strong>{formatCurrencyShort(newBalance)}</strong></span>
            </div>,
            { duration: 3000 }
          );
        } else {
          toast.success('Transaction ajoutée');
        }

        // Save last transaction for "Répéter" chip
        localStorage.setItem('budgetizer_last_transaction', JSON.stringify({
          type,
          amount: parseFloat(amount),
          accountId,
          categoryId: categoryId || null,
          note,
          tags: selectedTagIds,
          icon: selectedCategory?.icon || '💸',
          label: note || selectedCategory?.name || 'Dernière transaction'
        }));
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
      <div className="flex flex-col space-y-4">
        
        {/* PANEL 1: MAIN FORM */}
        {activePanel === 'form' && (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-2 select-none">
              <h2 className="text-xl font-bold text-primary">
                {transactionToEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}
              </h2>
              <div className="flex items-center gap-2">
                {/* Back Button for step 2 */}
                {formStep === 2 && !transactionToEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFormStep(1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-border/60 transition-colors text-xs font-bold text-secondary active:scale-95"
                  >
                    ← Retour
                  </button>
                )}
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

            {/* STEP 1: AMOUNT & QUICK FAVORITES */}
            {formStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Chip « Répéter la dernière transaction » */}
                {!transactionToEdit && lastTransaction && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRepeatLast();
                      setFormStep(2);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-surface border border-border/40 hover:border-accent/40 hover:bg-accent/5 active:scale-[0.98] transition-all text-left select-none group"
                  >
                    <span className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-base shrink-0 group-hover:bg-accent/20 transition-colors">
                      <RotateCcw size={15} className="text-accent" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-primary block truncate">
                        {lastTransaction.icon || '💸'} {lastTransaction.label || 'Dernière transaction'}
                      </span>
                      <span className="text-[10px] text-muted font-medium">
                        Répéter · {lastTransaction.type === 'expense' ? '−' : '+'}{formatCurrencyShort(lastTransaction.amount)}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-accent/70 shrink-0">1 tap →</span>
                  </button>
                )}

                {/* Quick Templates Banner */}
                {!transactionToEdit && templates.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 select-none w-full max-w-sm mx-auto">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onMouseDown={(e) => handleTemplatePressStart(e, t.id)}
                        onMouseUp={() => handleTemplatePressEnd(t.id)}
                        onMouseLeave={() => handleTemplatePressEnd(t.id)}
                        onTouchStart={(e) => handleTemplatePressStart(e, t.id)}
                        onTouchEnd={() => handleTemplatePressEnd(t.id)}
                        onClick={(e) => {
                          handleTemplateClick(e, t);
                          if (t.categoryId) setFormStep(2);
                        }}
                        className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-surface-2 hover:bg-border/30 border border-border/20 active:scale-95 transition-all text-xs font-medium text-secondary hover:text-primary shrink-0 select-none"
                      >
                        <span className="text-base">{t.icon || '⭐'}</span>
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-primary leading-tight">{t.name}</span>
                          <span className="text-[10px] text-muted font-bold font-premium-numbers">{t.amount}€</span>
                        </div>
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={handleSaveAsTemplate}
                      className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20 hover:bg-accent/10 hover:border-accent/40 active:scale-95 transition-all text-xs font-bold text-accent shrink-0"
                    >
                      <span>＋ Favori</span>
                    </button>
                  </div>
                )}
                
                {/* Type Selector */}
                <div className="flex bg-surface p-1 rounded-2xl mx-auto w-full max-w-sm shadow-sm border border-border/40 select-none">
                  <button 
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${type === 'expense' ? 'bg-copper text-white shadow-sm font-extrabold' : 'text-muted hover:text-primary'}`}
                  >
                    Dépense
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${type === 'income' ? 'bg-copper text-white shadow-sm font-extrabold' : 'text-muted hover:text-primary'}`}
                  >
                    Revenu
                  </button>
                </div>

                {/* Amount Display */}
                <AmountInput 
                  value={amount}
                  onChange={setAmount}
                  type={type}
                  autoFocus={isOpen && formStep === 1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (amount && parseFloat(amount) > 0) {
                        triggerHaptic('light');
                        setFormStep(2);
                      }
                    }
                  }}
                />

                {/* Continue Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!amount || parseFloat(amount) <= 0) {
                      triggerHaptic('error');
                      toast.error('Veuillez saisir un montant');
                      return;
                    }
                    triggerHaptic('light');
                    setFormStep(2);
                  }}
                  className={`w-full py-4 rounded-2xl text-white font-bold hover:scale-[1.01] active:scale-95 transition-all shadow-md mt-4 ${
                    type === 'expense' ? 'bg-danger shadow-danger/10' : 'bg-accent shadow-accent/10'
                  }`}
                >
                  Continuer
                </button>
              </div>
            )}

            {/* STEP 2: METADATA & VALIDATION */}
            {formStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Resulting balance live calculation */}
                {projectedBalance && (
                  <div className="flex justify-center -mt-1 animate-fadeIn select-none">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                      projectedBalance.positive
                        ? 'text-accent border-accent/25 bg-accent/5'
                        : projectedBalance.balance < 0
                        ? 'text-danger border-danger/25 bg-danger/5'
                        : 'text-secondary border-border/30 bg-surface'
                    }`}>
                      Solde {projectedBalance.name} après :{' '}
                      <span className="font-bold font-premium-numbers">
                        {formatCurrencyShort(projectedBalance.balance)}
                      </span>
                    </span>
                  </div>
                )}

                {/* Amount summary chip */}
                <div 
                  onClick={() => !transactionToEdit && setFormStep(1)}
                  className="flex justify-between items-center bg-surface-2 border border-border/40 p-3.5 rounded-xl cursor-pointer active:scale-98 select-none active:bg-surface-2/80 transition-colors"
                >
                  <span className="text-xs text-secondary font-medium">Montant saisi</span>
                  <span className={`text-base font-extrabold font-premium-numbers ${type === 'expense' ? 'text-danger' : 'text-accent'}`}>
                    {type === 'expense' ? '−' : '+'}{amount} €
                  </span>
                </div>
                {/* Hidden amount input for testing/accessibility in step 2 */}
                <div className="sr-only">
                  <AmountInput 
                    value={amount}
                    onChange={setAmount}
                    type={type}
                  />
                </div>

                {/* Note INPUT */}
                <div className="flex flex-col">
                  <label htmlFor="note-input" className="text-xs text-secondary font-medium mb-1.5 select-none font-bold">Note <span className="text-muted font-normal">(optionnel)</span></label>
                  <input
                    ref={noteInputRef}
                    id="note-input"
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={handleNoteKeyDown}
                    onBlur={handleNoteBlur}
                    placeholder="Ex: Resto avec amis..."
                    className="bg-surface border border-border rounded-xl p-3.5 text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Autocomplete Suggestions */}
                {suggestions.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 select-none w-full max-w-sm mx-auto animate-fadeIn -mt-2">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplySuggestion(s)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/5 hover:bg-accent/10 border border-accent/25 active:scale-95 transition-all text-xs font-bold text-secondary hover:text-primary shrink-0 select-none"
                      >
                        <span>{s.icon}</span>
                        <span className="font-bold">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Account and Category selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label htmlFor="account-select" className="text-xs text-secondary font-medium mb-1.5 select-none font-bold">Compte <span className="text-danger ml-0.5">*</span></label>
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
                     <label htmlFor="category-select" className="text-xs text-secondary font-medium mb-1.5 select-none font-bold">Catégorie <span className="text-danger ml-0.5">*</span></label>
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

                {/* (11) Budget active indicator */}
                {activeBudget && type === 'expense' && (
                  <div className="animate-fadeIn select-none">
                    {(() => {
                      const spent = activeBudget.spent || 0;
                      const limit = activeBudget.amount || 1;
                      const amountNum = parseFloat(amount) || 0;
                      const projectedSpent = spent + amountNum;
                      const pct = Math.min((projectedSpent / limit) * 100, 100);
                      const currentPct = Math.min((spent / limit) * 100, 100);
                      const isOverBudget = projectedSpent > limit;
                      const isWarning = pct >= 80;
                      const color = isOverBudget ? 'text-danger' : isWarning ? 'text-amber-400' : 'text-accent';
                      const barColor = isOverBudget ? 'bg-danger' : isWarning ? 'bg-amber-400' : 'bg-accent';
                      const catIcon = activeBudget.categoryId?.icon || selectedCategory?.icon || '📊';
                      const catName = activeBudget.categoryId?.name || selectedCategory?.name || 'Budget';
                      return (
                        <div className="bg-surface border border-border/40 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-bold text-secondary">
                              {catIcon} Enveloppe {catName}
                            </span>
                            <span className={`text-[11px] font-bold font-premium-numbers ${color}`}>
                              {amountNum > 0
                                ? `${formatCurrencyShort(projectedSpent)} / ${formatCurrencyShort(limit)}`
                                : `${formatCurrencyShort(spent)} / ${formatCurrencyShort(limit)}`
                              }
                            </span>
                          </div>
                          <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor} ${isOverBudget ? 'opacity-100' : 'opacity-70'}`}
                              style={{ width: `${amountNum > 0 ? pct : currentPct}%` }}
                            />
                          </div>
                          {isOverBudget && (
                            <p className="text-[10px] text-danger font-semibold mt-1.5">
                              ⚠️ Dépassement de {formatCurrencyShort(projectedSpent - limit)}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Date accordion style */}
                <div>
                  <label htmlFor="date-input" className="sr-only">Date</label>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(p => !p)}
                    className="flex items-center gap-2 text-xs text-secondary font-medium hover:text-primary transition-colors py-1 select-none font-bold"
                  >
                    <span>📅</span>
                    <span>
                      {date === new Date().toISOString().split('T')[0]
                        ? "Aujourd'hui"
                        : new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                      }
                    </span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${showDatePicker ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <input
                    id="date-input"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    onClick={(e) => {
                      try { e.target.showPicker(); } catch (err) {}
                    }}
                    className={showDatePicker 
                      ? "mt-2 bg-surface border border-border rounded-xl p-3 text-primary focus:outline-none focus:border-accent w-full text-xs animate-fadeIn"
                      : "sr-only"
                    }
                    required
                    autoFocus={showDatePicker}
                  />
                </div>

                {/* Tag Selector */}
                <TagSelector
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />

                {/* Submit Action Buttons */}
                <div className="sticky bottom-0 pt-3 pb-1 bg-gradient-to-t from-[var(--surface-2,#1a1a2e)] via-[var(--surface-2,#1a1a2e)/95] to-transparent z-10">
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
                        className={`flex-[2] py-4 rounded-2xl text-white font-bold hover:scale-[1.01] active:scale-95 transition-all shadow-md ${
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
                      className={`w-full py-4 rounded-2xl text-white font-bold hover:scale-[1.01] active:scale-95 transition-all shadow-md ${
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
            )}
          </>
        )}

        {/* PANEL 2: SELECT ACCOUNT */}
        {activePanel === 'account' && (
          <div className="space-y-4 animate-fadeIn">
            {/* (13) Account selector Header */}
            <div className="pb-2 border-b border-border/40 select-none">
              <div className="flex items-center justify-between mb-3">
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActivePanel('form');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface-2 text-xs font-bold hover:bg-border/60 text-secondary active:scale-95"
                >
                  ← Retour
                </button>
                <div className="flex gap-1 bg-surface p-1 rounded-xl">
                  <span className="px-3 py-1 rounded-lg bg-accent text-white text-[10px] font-bold">Compte</span>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); setActivePanel('category'); }}
                    disabled={type === 'transfer'}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold text-muted hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Catégorie
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">Sélectionner un compte</h3>
                <p className="text-[10px] text-muted font-medium mt-0.5">Choisissez le compte de débit/crédit</p>
              </div>
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
                        ? 'bg-accent/10 border-accent text-primary font-bold shadow-sm' 
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
            {/* (13) Direct category selector Header */}
            <div className="pb-2 border-b border-border/40 select-none">
              <div className="flex items-center justify-between mb-3">
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActivePanel('form');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface-2 text-xs font-bold hover:bg-border/60 text-secondary active:scale-95"
                >
                  ← Retour
                </button>
                <div className="flex gap-1 bg-surface p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); setActivePanel('account'); }}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold text-muted hover:text-primary transition-colors"
                  >
                    Compte
                  </button>
                  <span className="px-3 py-1 rounded-lg bg-accent text-white text-[10px] font-bold">Catégorie</span>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">Sélectionner une catégorie</h3>
                <p className="text-[10px] text-muted font-medium mt-0.5">Choisissez la catégorie pour cette transaction</p>
              </div>
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
                            ? 'bg-accent/15 border-accent text-primary font-bold shadow-sm' 
                            : 'bg-surface border-border/40 hover:bg-surface-2/85 active:scale-[0.99]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                            style={{
                              backgroundColor: `${parent.color || '#3b82f6'}18`,
                              color: parent.color || '#3b82f6',
                              border: `1px solid ${parent.color || '#3b82f6'}20`
                            }}
                          >
                            {parent.icon || '📁'}
                          </span>
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
                                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                                  isChildSelected 
                                    ? 'bg-accent/10 border-accent text-accent font-bold shadow-sm' 
                                    : 'bg-surface-2/50 border-border/20 hover:border-border/40 active:scale-95'
                                }`}
                              >
                                <span 
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                                  style={{
                                    backgroundColor: `${child.color || parent.color || '#3b82f6'}18`,
                                    color: child.color || parent.color || '#3b82f6',
                                    border: `1px solid ${child.color || parent.color || '#3b82f6'}20`
                                  }}
                                >
                                  {child.icon || parent.icon || '📁'}
                                </span>
                                <span className="text-[11.5px] truncate text-primary font-semibold">{child.name}</span>
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
        <p className="text-xs text-secondary leading-relaxed select-none">
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
