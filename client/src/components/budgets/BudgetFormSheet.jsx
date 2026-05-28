import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useCategories } from '../../hooks/useCategories';
import toast from 'react-hot-toast';

const BudgetFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [period, setPeriod] = useState('monthly');

  const { categoriesTree } = useCategories();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAmount(initialData.amount);
      setCategoryId(initialData.categoryId?._id || initialData.categoryId);
      setColor(initialData.color);
      setPeriod(initialData.period);
    } else {
      setName('');
      setAmount('');
      setCategoryId('');
      setColor('#8b5cf6');
      setPeriod('monthly');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId) return toast.error('Veuillez sélectionner une catégorie');
    if (!amount || amount <= 0) return toast.error('Montant invalide');

    try {
      await onSave({
        name,
        amount: parseFloat(amount),
        categoryId,
        color,
        period
      });
      toast.success(initialData ? 'Budget modifié' : 'Budget créé');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const colors = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
    '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e',
    '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
  ];

  // Only expense categories make sense for budgets usually
  const expenseCategories = categoriesTree.expense || [];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier le budget' : 'Nouveau budget'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom du budget"
          placeholder="Ex: Courses mensuelles"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 text-sm text-secondary font-medium block">Montant (€)</label>
            <input
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary font-mono text-lg focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div className="flex-1">
            <label className="mb-2 text-sm text-secondary font-medium block">Période</label>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none"
            >
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
              <option value="yearly">Annuelle</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Catégorie associée</label>
          <select 
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none"
            required
          >
            <option value="">-- Choisir une catégorie --</option>
            {expenseCategories.map(parent => (
              <optgroup key={parent._id} label={`${parent.icon} ${parent.name}`}>
                <option value={parent._id}>{parent.name}</option>
                {parent.children?.map(child => (
                  <option key={child._id} value={child._id}>↳ {child.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur d'identification</label>
          <div className="flex flex-wrap gap-2">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button type="submit" fullWidth>
            {initialData ? 'Enregistrer les modifications' : 'Créer le budget'}
          </Button>

          {initialData && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer ce budget ?")) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Budget supprimé');
                    onClose();
                  } catch (e) {
                    toast.error('Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
            >
              Supprimer le budget
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default BudgetFormSheet;
