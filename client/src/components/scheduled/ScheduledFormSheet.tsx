import React, { useState, useEffect, useRef } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import AmountInput from '../ui/AmountInput';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import BottomSheet from '../ui/BottomSheet';
import ConfirmModal from '../ui/ConfirmModal';
import { triggerHaptic } from '../../utils/hapticHelper';
import { X, Calendar, Repeat, ShieldCheck, CreditCard, ChevronRight, Check } from 'lucide-react';

const POPULAR_SUBSCRIPTIONS = [
  { id: 'def-netflix', name: 'Netflix', amount: 15.99, icon: '🎬', categoryName: 'Loisirs', color: '#E50914' },
  { id: 'def-spotify', name: 'Spotify', amount: 10.99, icon: '🎵', categoryName: 'Loisirs', color: '#1DB954' },
  { id: 'def-prime', name: 'Amazon Prime', amount: 6.99, icon: '📦', categoryName: 'Services', color: '#FF9900' },
  { id: 'def-icloud', name: 'iCloud', amount: 2.99, icon: '☁️', categoryName: 'Services', color: '#007AFF' },
  { id: 'def-youtube', name: 'YouTube Premium', amount: 12.99, icon: '📺', categoryName: 'Loisirs', color: '#FF0000' }
];

const ScheduledFormSheet = ({ isOpen, onClose, onSave, initialData, defaultIsSubscription = false }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  
  // Recurrence
  const [frequencyEvery, setFrequencyEvery] = useState(1);
  const [frequencyUnit, setFrequencyUnit] = useState('month');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numberOfTimes, setNumberOfTimes] = useState(0);
  const [endDate, setEndDate] = useState('');

  // Options
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [isSubscription, setIsSubscription] = useState(defaultIsSubscription);
  const [toAccountId, setToAccountId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Custom Templates state
  const [subTemplates, setSubTemplates] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  
  const longPressTimers = useRef({});

  // Dropdown menus
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const { accounts } = useAccounts();
  const { categoriesTree } = useCategories();

  // Load custom templates
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('budgetizer_subscription_templates');
      if (stored) {
        try {
          setSubTemplates(JSON.parse(stored));
        } catch (e) {
          setSubTemplates(POPULAR_SUBSCRIPTIONS);
        }
      } else {
        setSubTemplates(POPULAR_SUBSCRIPTIONS);
        localStorage.setItem('budgetizer_subscription_templates', JSON.stringify(POPULAR_SUBSCRIPTIONS));
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setAccountId(initialData.accountId?._id || initialData.accountId || '');
        setCategoryId(initialData.categoryId?._id || initialData.categoryId || '');
        setDescription(initialData.description || '');
        setNote(initialData.note || '');
        setFrequencyEvery(initialData.frequency?.every || 1);
        setFrequencyUnit(initialData.frequency?.unit || 'month');
        setStartDate(new Date(initialData.startDate).toISOString().split('T')[0]);
        setNumberOfTimes(initialData.numberOfTimes || 0);
        setEndDate(initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
        setAutoConfirm(initialData.autoConfirm !== undefined ? initialData.autoConfirm : true);
        setIsSubscription(initialData.isSubscription !== undefined ? initialData.isSubscription : false);
        setToAccountId(initialData.toAccountId?._id || initialData.toAccountId || '');
        setShowAdvanced(false);
      } else {
        setAmount('');
        setDescription('');
        setNote('');
        setFrequencyEvery(1);
        setFrequencyUnit('month');
        setStartDate(new Date().toISOString().split('T')[0]);
        setNumberOfTimes(0);
        setEndDate('');
        setAutoConfirm(true);
        setIsSubscription(defaultIsSubscription);
        setShowAdvanced(false);
        if (accounts.length > 0) {
          setAccountId(accounts[0]._id);
          setToAccountId(accounts[1]?._id || '');
        }
      }
    }
  }, [isOpen, initialData, accounts, defaultIsSubscription]);

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) return alert('Veuillez saisir un montant valide');
    if (!accountId) return alert('Veuillez sélectionner un compte');
    if (type !== 'transfer' && !categoryId) return alert('Veuillez sélectionner une catégorie');
    if (!description) return alert('Veuillez saisir une description');

    onSave({
      type,
      amount: parseFloat(amount),
      accountId,
      categoryId: type === 'transfer' ? undefined : categoryId,
      description,
      note,
      frequency: {
        every: Number(frequencyEvery),
        unit: frequencyUnit
      },
      startDate: new Date(startDate),
      numberOfTimes: Number(numberOfTimes),
      endDate: endDate ? new Date(endDate) : null,
      autoConfirm,
      isSubscription,
      toAccountId: type === 'transfer' ? toAccountId : undefined
    });
  };

  const handleSelectQuickSub = (sub) => {
    triggerHaptic?.('light');
    setDescription(sub.name);
    setAmount(String(sub.amount));
    setIsSubscription(true);
    setType('expense');
    setAutoConfirm(true);
    
    // Find matching category ID from tree
    let foundCatId = '';
    const expenseCats = categoriesTree.expense || [];
    
    const findCat = (cats) => {
      for (const cat of cats) {
        if (cat.name.toLowerCase().includes(sub.categoryName.toLowerCase()) || 
            cat.name.toLowerCase().includes('abonnement') || 
            cat.name.toLowerCase().includes('loisir') ||
            cat.name.toLowerCase().includes('service')) {
          return cat._id;
        }
        if (cat.children && cat.children.length > 0) {
          const childId = findCat(cat.children);
          if (childId) return childId;
        }
      }
      return null;
    };
    
    foundCatId = findCat(expenseCats);
    if (!foundCatId && expenseCats.length > 0) {
      foundCatId = expenseCats[0]._id;
    }
    
    if (foundCatId) {
      setCategoryId(foundCatId);
    }
  };

  const handleSaveAsSubTemplate = () => {
    if (!description || !amount || parseFloat(amount) <= 0) {
      alert('Veuillez renseigner une description et un montant valide.');
      return;
    }

    // Find matching category to extract name/icon
    let categoryName = 'Dépense';
    let icon = '💳';
    const expenseCats = categoriesTree.expense || [];
    const allCats = [...expenseCats, ...(categoriesTree.income || [])];

    const findCat = (cats) => {
      for (const cat of cats) {
        if (cat._id === categoryId) return cat;
        if (cat.children && cat.children.length > 0) {
          const child = findCat(cat.children);
          if (child) return child;
        }
      }
      return null;
    };

    const matched = findCat(allCats);
    if (matched) {
      categoryName = matched.name;
      icon = matched.icon || '💳';
    }

    const newTemplate = {
      id: 'sub-template-' + Date.now(),
      name: description,
      amount: parseFloat(amount),
      icon,
      categoryName
    };

    const updated = [newTemplate, ...subTemplates.filter(t => t.name.toLowerCase() !== description.toLowerCase())].slice(0, 10);
    setSubTemplates(updated);
    localStorage.setItem('budgetizer_subscription_templates', JSON.stringify(updated));
    triggerHaptic?.('medium');
    alert('Modèle enregistré comme modèle rapide !');
  };

  const handleTemplatePressStart = (e, template) => {
    if (longPressTimers.current[template.id || template.name]) {
      clearTimeout(longPressTimers.current[template.id || template.name]);
    }
    
    longPressTimers.current[template.id || template.name] = setTimeout(() => {
      triggerHaptic?.('medium');
      setTemplateToDelete(template);
      setConfirmDeleteOpen(true);
      longPressTimers.current[template.id || template.name] = null;
    }, 800);
  };

  const handleTemplatePressEnd = (template) => {
    const key = template.id || template.name;
    if (longPressTimers.current[key]) {
      clearTimeout(longPressTimers.current[key]);
      longPressTimers.current[key] = null;
    }
  };

  const handleConfirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    const updated = subTemplates.filter(t => (t.id && t.id !== templateToDelete.id) || t.name !== templateToDelete.name);
    setSubTemplates(updated);
    localStorage.setItem('budgetizer_subscription_templates', JSON.stringify(updated));
    setConfirmDeleteOpen(false);
    setTemplateToDelete(null);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier la planification' : 'Nouvelle planification'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      {/* Form Body */}
      <div className="space-y-6">
        
        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-surface-2 p-1.5 rounded-2xl">
          {['expense', 'income', 'transfer'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId('');
              }}
              className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                type === t 
                  ? 'bg-surface text-primary shadow-sm' 
                  : 'text-muted hover:text-primary'
              }`}
            >
              {t === 'expense' ? 'Dépense' : t === 'income' ? 'Revenu' : 'Virement'}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="bg-surface-2/40 p-4 rounded-3xl border border-border/40 space-y-1.5 text-center">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Montant de la planification</p>
          <AmountInput 
            value={amount}
            onChange={setAmount}
            type={type}
            autoFocus={isOpen}
          />
        </div>

        {/* Popular Subscriptions Carousel */}
        {type === 'expense' && subTemplates.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Abonnements rapides</span>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 px-0.5">
              {subTemplates.map(sub => (
                <button
                  key={sub.id || sub.name}
                  type="button"
                  onClick={() => handleSelectQuickSub(sub)}
                  onMouseDown={(e) => handleTemplatePressStart(e, sub)}
                  onMouseUp={() => handleTemplatePressEnd(sub)}
                  onTouchStart={(e) => handleTemplatePressStart(e, sub)}
                  onTouchEnd={() => handleTemplatePressEnd(sub)}
                  className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 bg-surface-2 hover:bg-surface-2/80 active:scale-95 border border-border/40 rounded-xl transition-all select-none relative group"
                  title="Appui long pour supprimer"
                >
                  <span className="text-base">{sub.icon}</span>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-primary leading-tight">{sub.name}</p>
                    <p className="text-[9px] text-copper font-bold mt-0.5">{sub.amount} €</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[8.5px] text-muted font-medium pl-0.5">💡 Appuyez longuement sur un modèle pour le supprimer.</p>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          
          {/* Description Input & Save Template Button */}
          <div className="relative">
            <Input 
              id="description-input"
              label="Nom / Description"
              placeholder="ex: Loyer, Netflix, Gym..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            {type === 'expense' && description && amount && (
              <button
                type="button"
                onClick={handleSaveAsSubTemplate}
                className="absolute right-0.5 top-0 text-[10px] font-extrabold text-copper hover:underline transition-all z-10"
              >
                Sauver modèle
              </button>
            )}
          </div>

          {/* Account Selector */}
          <Select
            id="accountId-select"
            label="Compte bancaire"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map(acc => (
              <option key={acc._id} value={acc._id}>{acc.name} ({acc.balance.toFixed(2)} €)</option>
            ))}
          </Select>

          {/* To Account Selector (Only for Transfers) */}
          {type === 'transfer' && (
            <Select
              id="toAccountId-select"
              label="Vers le compte"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            >
              <option value="">Sélectionner un compte destinataire</option>
              {accounts.filter(a => a._id !== accountId).map(acc => (
                <option key={acc._id} value={acc._id}>{acc.name}</option>
              ))}
            </Select>
          )}

          {/* Category Selector (Only for income/expense) */}
          {type !== 'transfer' && (
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-secondary">Catégorie <span className="text-danger ml-0.5">*</span></label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full bg-surface-2 border border-border/40 px-4 h-[52px] rounded-2xl text-sm text-primary flex justify-between items-center focus:outline-none focus:border-copper transition-colors"
              >
                <span className="flex items-center gap-2">
                  {categoryId ? (
                    (() => {
                      let selectedCat = null;
                      const allCats = [
                        ...(categoriesTree.expense || []),
                        ...(categoriesTree.income || [])
                      ];
                      allCats.forEach(parent => {
                        if (parent._id === categoryId) selectedCat = parent;
                        parent.children?.forEach(child => {
                          if (child._id === categoryId) selectedCat = child;
                        });
                      });
                      return selectedCat ? (
                        <>
                          <span>{selectedCat.icon}</span>
                          <span className="font-bold">{selectedCat.name}</span>
                        </>
                      ) : 'Choisir une catégorie';
                    })()
                  ) : 'Choisir une catégorie'}
                </span>
                <ChevronRight size={18} className={`text-muted transition-transform ${isCategoryOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Collapsible tree */}
              {isCategoryOpen && (
                <div className="absolute top-[76px] left-0 right-0 max-h-60 overflow-y-auto bg-surface-2 border border-border rounded-2xl p-3 z-30 shadow-xl space-y-2">
                  {((type === 'expense' ? categoriesTree.expense : categoriesTree.income) || []).map(parent => (
                    <div key={parent._id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryId(parent._id);
                          setIsCategoryOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold ${
                          categoryId === parent._id ? 'bg-copper-dim text-copper' : 'text-primary hover:bg-surface'
                        }`}
                      >
                        <span className="flex items-center gap-2"><span>{parent.icon}</span>{parent.name}</span>
                        {categoryId === parent._id && <Check size={14} />}
                      </button>

                      {/* Children */}
                      {parent.children && parent.children.length > 0 && (
                        <div className="pl-6 space-y-1">
                          {parent.children.map(child => (
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryId(child._id);
                                setIsCategoryOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between text-xs ${
                                categoryId === child._id ? 'bg-copper-dim text-copper font-bold' : 'text-secondary hover:bg-surface'
                              }`}
                            >
                              <span className="flex items-center gap-2"><span>{child.icon}</span>{child.name}</span>
                              {categoryId === child._id && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary">Note (optionnel)</label>
            <textarea 
              placeholder="Notes supplémentaires..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-surface-2 border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-copper resize-none transition-colors"
            />
          </div>

        </div>

        {/* Recurrence Section (Dynamic) */}
        {(!isSubscription || showAdvanced) ? (
          <div className="p-5 bg-surface-2 rounded-3xl border border-border/40 space-y-4">
            <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase flex items-center gap-2">
              <Repeat size={16} /> Récurrence
            </h3>
            
            {/* Frequency options */}
            <div className="flex gap-3 items-center">
              <span className="text-xs text-secondary font-bold">Répéter tous les</span>
              <input 
                type="number" 
                value={frequencyEvery} 
                onChange={(e) => setFrequencyEvery(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-surface border border-border/40 text-center py-2 rounded-xl text-sm font-bold text-primary focus:outline-none focus:border-copper"
              />
              <Select
                value={frequencyUnit}
                onChange={(e) => setFrequencyUnit(e.target.value)}
                className="bg-surface border border-border/40 py-2 px-3 rounded-xl text-sm font-bold text-primary focus:outline-none flex-1"
              >
                <option value="day">Jour(s)</option>
                <option value="week">Semaine(s)</option>
                <option value="month">Mois</option>
                <option value="year">An(s)</option>
              </Select>
            </div>

            {/* Start Date picker */}
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs text-secondary font-bold flex items-center gap-1.5">
                <Calendar size={14} /> Date de début
              </span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-copper"
              />
            </div>

            {/* Max occurrences & End date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Nb Répétitions (0=infini)</label>
                <input 
                  type="number"
                  value={numberOfTimes}
                  onChange={(e) => setNumberOfTimes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-copper"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Date de Fin (optionnel)</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-copper"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Simplified Recurrence for standard subscriptions */
          <div className="p-5 bg-surface-2 rounded-3xl border border-border/40 space-y-3">
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs text-primary font-bold flex items-center gap-1.5">
                <Calendar size={14} className="text-copper" /> Date du premier prélèvement
              </span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-copper"
              />
            </div>
            <p className="text-[10px] text-muted leading-relaxed">
              L'abonnement sera reconduit mensuellement à partir de cette date.
            </p>
          </div>
        )}

        {/* Options (Auto-confirm & Subscription toggles) */}
        <div className="space-y-4 p-5 bg-surface-2 rounded-3xl border border-border/40">
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase flex items-center gap-2">
            Configuration & Type
          </h3>

          {/* Subscription toggle */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-primary font-bold flex items-center gap-1.5">
              <CreditCard size={16} className="text-copper" /> C'est un abonnement récurrent
            </span>
            <input 
              type="checkbox"
              checked={isSubscription}
              onChange={(e) => {
                setIsSubscription(e.target.checked);
                if (e.target.checked) {
                  setFrequencyEvery(1);
                  setFrequencyUnit('month');
                  setAutoConfirm(true);
                }
              }}
              className="w-5 h-5 rounded-md accent-copper cursor-pointer"
            />
          </div>

          {/* Auto confirm toggle */}
          {(!isSubscription || showAdvanced) && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-primary font-bold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-copper" /> Confirmation automatique
                </span>
                <input 
                  type="checkbox"
                  checked={autoConfirm}
                  onChange={(e) => setAutoConfirm(e.target.checked)}
                  className="w-5 h-5 rounded-md accent-copper cursor-pointer"
                />
              </div>
              {!autoConfirm && (
                <p className="text-[11px] text-muted leading-relaxed pl-5 bg-surface p-2 rounded-lg border border-border/30">
                  Vous serez notifié pour confirmer manuellement chaque échéance à la date prévue. Utile pour les factures à montants variables.
                </p>
              )}
            </div>
          )}

          {/* Advanced toggle button */}
          {isSubscription && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[10px] font-extrabold text-copper hover:underline flex items-center gap-1 mt-1"
            >
              {showAdvanced ? 'Masquer les paramètres avancés' : 'Afficher les paramètres avancés'}
            </button>
          )}
        </div>

        {/* Action button */}
        <Button
          onClick={handleSave}
          fullWidth
          variant="copper"
          className="mt-6 font-bold"
        >
          {initialData ? 'Enregistrer les modifications' : 'Créer la planification'}
        </Button>

      </div>

      {/* Confirm Template Deletion Modal */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleConfirmDeleteTemplate}
        title="Supprimer le modèle ?"
        confirmText="Supprimer"
        cancelText="Conserver"
        type="danger"
      >
        <p className="text-xs text-secondary leading-relaxed">
          Voulez-vous vraiment supprimer le modèle d'abonnement <strong>{templateToDelete?.name}</strong> ?
        </p>
      </ConfirmModal>
    </BottomSheet>
  );
};

export default ScheduledFormSheet;
