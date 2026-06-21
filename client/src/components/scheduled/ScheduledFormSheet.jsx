import React, { useState, useEffect } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import AmountInput from '../ui/AmountInput';
import Select from '../ui/Select';
import { X, Calendar, Repeat, ShieldCheck, CreditCard, ChevronRight, Check } from 'lucide-react';

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

  // Dropdown menus
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const { accounts } = useAccounts();
  const { categoriesTree } = useCategories();

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
      {/* Tap outside to close */}
      <div className="flex-1" onClick={onClose} />
      
      {/* Bottom Sheet container */}
      <div className="bg-surface rounded-t-[32px] max-h-[92vh] overflow-y-auto w-full max-w-md mx-auto flex flex-col shadow-2xl no-scrollbar border-t border-border">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border/40">
          <h2 className="text-md font-bold text-primary">
            {initialData ? 'Modifier la planification' : 'Nouvelle planification'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
            <X size={20} className="text-secondary" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-surface-2 p-1.5 rounded-2xl">
            {['expense', 'income', 'transfer'].map(t => (
              <button
                key={t}
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

          {/* Basic Fields */}
          <div className="space-y-4">
            
            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="description-input" className="text-xs font-bold text-secondary">Nom / Description <span className="text-danger ml-0.5">*</span></label>
              <input 
                id="description-input"
                type="text"
                placeholder="ex: Loyer, Netflix, Gym..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface-2 border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Account Selector */}
            <Select
              id="accountId-select"
              label="Compte bancaire"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-surface-2 border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
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
                className="w-full bg-surface-2 border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent"
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
                  className="w-full bg-surface-2 border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary flex justify-between items-center focus:outline-none"
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
                  <div className="absolute top-[72px] left-0 right-0 max-h-60 overflow-y-auto bg-surface-2 border border-border rounded-2xl p-3 z-30 shadow-xl space-y-2">
                    {((type === 'expense' ? categoriesTree.expense : categoriesTree.income) || []).map(parent => (
                      <div key={parent._id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryId(parent._id);
                            setIsCategoryOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold ${
                            categoryId === parent._id ? 'bg-accent/10 text-accent' : 'text-primary hover:bg-surface'
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
                                  categoryId === child._id ? 'bg-accent/10 text-accent font-bold' : 'text-secondary hover:bg-surface'
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

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary">Note (optionnel)</label>
              <textarea 
                placeholder="Notes supplémentaires..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full bg-surface-2 border border-border/40 px-4 py-3 rounded-2xl text-sm text-primary focus:outline-none focus:border-accent resize-none"
              />
            </div>

          </div>

          {/* Recurrence Section */}
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
                className="w-16 bg-surface border border-border/40 text-center py-2 rounded-xl text-sm font-bold text-primary focus:outline-none"
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
                onClick={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {}
                }}
                className="bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
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
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Date de Fin (optionnel)</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (err) {}
                  }}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Options (Auto-confirm & Subscription toggles) */}
          <div className="space-y-4 p-5 bg-surface-2 rounded-3xl border border-border/40">
            <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase flex items-center gap-2">
              Configuration & Type
            </h3>

            {/* Auto confirm toggle */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-primary font-bold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-accent" /> Confirmation automatique
                </span>
                <input 
                  type="checkbox"
                  checked={autoConfirm}
                  onChange={(e) => setAutoConfirm(e.target.checked)}
                  className="w-5 h-5 rounded-md accent-accent"
                />
              </div>
              {!autoConfirm && (
                <p className="text-[11px] text-muted leading-relaxed pl-5 bg-surface p-2 rounded-lg border border-border/30">
                  Vous serez notifié pour confirmer manuellement chaque échéance à la date prévue. Utile pour les factures à montants variables.
                </p>
              )}
            </div>

            {/* Subscription toggle */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-primary font-bold flex items-center gap-1.5">
                <CreditCard size={16} className="text-accent" /> C'est un abonnement récurrent
              </span>
              <input 
                type="checkbox"
                checked={isSubscription}
                onChange={(e) => setIsSubscription(e.target.checked)}
                className="w-5 h-5 rounded-md accent-accent"
              />
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleSave}
            className="w-full bg-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-md mt-6"
          >
            {initialData ? 'Enregistrer les modifications' : 'Créer la planification'}
          </button>

        </div>

      </div>
    </div>
  );
};

export default ScheduledFormSheet;
