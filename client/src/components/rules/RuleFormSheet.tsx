import React, { useState } from 'react';
import { IRuleCondition, IRuleAction, ConditionField, ConditionOperator } from '@budgetizer/shared';
import { useCategories } from '../../hooks/useCategories';
import { testRule } from '../../services/ruleService';
import { Plus, Trash2, CheckCircle2, AlertCircle, Play, Sliders, X } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import Select from '../ui/Select';

interface RuleFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleData: {
    name: string;
    priority?: number;
    isActive?: boolean;
    matchLogic?: 'AND' | 'OR';
    conditions: IRuleCondition[];
    actions: IRuleAction;
    applyRetroactively?: boolean;
  }) => Promise<void>;
  initialData?: any;
}

export const RuleFormSheet: React.FC<RuleFormSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const { categories } = useCategories();
  const [name, setName] = useState(initialData?.name || '');
  const [matchLogic, setMatchLogic] = useState<'AND' | 'OR'>(initialData?.matchLogic || 'AND');
  const [isActive, setIsActive] = useState<boolean>(initialData?.isActive !== undefined ? initialData.isActive : true);
  const [applyRetroactively, setApplyRetroactively] = useState<boolean>(false);
  const [conditions, setConditions] = useState<IRuleCondition[]>(
    initialData?.conditions || [{ field: 'description', operator: 'contains', value: '' }]
  );
  const [categoryId, setCategoryId] = useState<string>(initialData?.actions?.categoryId || '');
  const [autoReview, setAutoReview] = useState<boolean>(initialData?.actions?.autoReview || false);
  const [renameDescription, setRenameDescription] = useState<string>(initialData?.actions?.renameDescription || '');
  
  // State du Live Tester
  const [testKeyword, setTestKeyword] = useState('');
  const [testAmount, setTestAmount] = useState<number | ''>('');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddCondition = () => {
    setConditions(prev => [...prev, { field: 'description', operator: 'contains', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) return;
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof IRuleCondition, val: any) => {
    setConditions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    try {
      const res = await testRule({
        conditions,
        matchLogic,
        sampleTransaction: {
          description: testKeyword,
          amount: Number(testAmount) || 0
        }
      });
      setTestResult(res.isMatch);
    } catch (err) {
      console.error(err);
      setTestResult(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name,
        isActive,
        matchLogic,
        conditions,
        actions: {
          categoryId: categoryId || null,
          autoReview,
          renameDescription: renameDescription.trim() || undefined
        },
        applyRetroactively
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-copper/10 text-copper flex items-center justify-center">
              <Sliders size={14} />
            </div>
            <h2 className="text-sm font-extrabold text-primary">
              {initialData ? 'Modifier la règle' : 'Nouvelle règle intelligente'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-2 text-secondary hover:text-primary transition-all active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom de la règle */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted mb-1.5">
              Nom de la règle
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Abonnement Netflix ou Courses Carrefour"
              className="w-full bg-surface border border-border/40 rounded-2xl px-3.5 py-2.5 text-xs text-primary placeholder:text-muted font-bold focus:outline-none focus:border-copper/50 transition-all"
            />
          </div>

          {/* Conditions (Cartes flex-wrap pour éviter le débordement sur mobile) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                Si la transaction répond à :
              </label>
              <button
                type="button"
                onClick={() => setMatchLogic(m => m === 'AND' ? 'OR' : 'AND')}
                className="text-[10px] text-copper bg-copper/10 px-2 py-0.5 rounded-lg border border-copper/20 font-black hover:bg-copper/20 transition-all"
              >
                Logique : {matchLogic === 'AND' ? 'TOUTES' : 'AU MOINS UNE'}
              </button>
            </div>

            {conditions.map((cond, idx) => (
              <div key={idx} className="bg-surface p-3 rounded-2xl border border-border/40 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Select
                      label="Champ"
                      value={cond.field}
                      onChange={e => handleConditionChange(idx, 'field', e.target.value as ConditionField)}
                      className="w-full bg-surface-2 border border-border/40 rounded-xl px-2.5 py-2 text-xs font-bold text-primary"
                    >
                      <option value="description">Libellé</option>
                      <option value="amount">Montant (€)</option>
                      <option value="type">Type</option>
                    </Select>
                  </div>

                  <div>
                    <Select
                      label="Condition"
                      value={cond.operator}
                      onChange={e => handleConditionChange(idx, 'operator', e.target.value as ConditionOperator)}
                      className="w-full bg-surface-2 border border-border/40 rounded-xl px-2.5 py-2 text-xs font-bold text-primary"
                    >
                      <option value="contains">contient</option>
                      <option value="equals">égal à</option>
                      <option value="starts_with">commence par</option>
                      <option value="greater_than">plus grand que</option>
                      <option value="less_than">plus petit que</option>
                      <option value="regex">regex</option>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      type={cond.field === 'amount' ? 'number' : 'text'}
                      value={cond.value}
                      onChange={e => handleConditionChange(idx, 'value', e.target.value)}
                      placeholder="Valeur recherchée..."
                      className="w-full bg-surface-2 border border-border/40 rounded-xl px-3 py-2 text-xs text-primary font-bold placeholder:text-muted focus:outline-none focus:border-copper/50"
                    />
                  </div>

                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(idx)}
                      className="p-2 text-secondary hover:text-rose-400 rounded-xl bg-surface-2 hover:bg-rose-500/10 border border-border/30 transition-all shrink-0"
                      title="Supprimer la condition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddCondition}
              className="flex items-center gap-1 text-xs text-copper font-extrabold hover:underline pt-1"
            >
              <Plus size={14} /> Ajouter une condition
            </button>
          </div>

          {/* Action à appliquer */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">
              Action automatique :
            </label>

            <div>
              <Select
                label="Attribuer la catégorie"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-surface border border-border/40 rounded-2xl px-3.5 py-2.5 text-xs text-primary font-bold"
              >
                <option value="">-- Aucune modification --</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.icon || '📁'} {c.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-secondary mb-1">Renommer le libellé (optionnel)</label>
              <input
                type="text"
                value={renameDescription}
                onChange={e => setRenameDescription(e.target.value)}
                placeholder="ex: Abonnement Netflix"
                className="w-full bg-surface border border-border/40 rounded-2xl px-3.5 py-2 text-xs text-primary font-bold placeholder:text-muted focus:outline-none focus:border-copper/50"
              />
            </div>

            <label className="flex items-center gap-2.5 bg-surface p-3 rounded-2xl border border-border/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoReview}
                onChange={e => setAutoReview(e.target.checked)}
                className="accent-copper w-4 h-4 rounded cursor-pointer shrink-0"
              />
              <span className="text-xs font-bold text-primary">
                Pointer / valider automatiquement la transaction
              </span>
            </label>
          </div>

          {/* Tester la règle en direct */}
          <div className="bg-surface p-3.5 rounded-2xl border border-border/40 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-copper flex items-center gap-1">
              <Play size={12} /> Tester en direct
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testKeyword}
                onChange={e => setTestKeyword(e.target.value)}
                placeholder="ex: CARREFOUR CITY"
                className="flex-1 min-w-0 bg-surface-2 border border-border/40 rounded-xl px-3 py-2 text-xs text-primary font-bold placeholder:text-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRunTest}
                disabled={isTesting || !testKeyword}
                className="px-3 py-2 bg-copper/10 hover:bg-copper/20 text-copper border border-copper/20 text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                {isTesting ? '...' : 'Tester'}
              </button>
            </div>

            {testResult !== null && (
              <div className={`text-xs p-2.5 rounded-xl flex items-center gap-2 font-bold ${
                testResult 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {testResult ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResult ? 'Match réussi ! La règle s’appliquera.' : 'Ne matche pas avec cet exemple.'}</span>
              </div>
            )}
          </div>

          {/* Option d'application rétroactive */}
          {!initialData && (
            <label className="flex items-center gap-2.5 bg-copper/5 border border-copper/20 p-3 rounded-2xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyRetroactively}
                onChange={e => setApplyRetroactively(e.target.checked)}
                className="accent-copper w-4 h-4 rounded cursor-pointer shrink-0"
              />
              <span className="text-[11px] font-bold text-copper">
                Appliquer immédiatement aux transactions passées
              </span>
            </label>
          )}

          {/* Footer Submit Actions */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-secondary hover:text-primary transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-copper hover:bg-copper/90 text-white font-extrabold text-xs rounded-xl shadow-sm shadow-copper/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Enregistrement...' : (initialData ? 'Enregistrer' : 'Créer la règle')}
            </button>
          </div>
        </form>
      </div>
    </BottomSheet>
  );
};

