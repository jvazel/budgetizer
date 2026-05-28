import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const SavingsGoalFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTargetAmount(initialData.targetAmount);
      // Format targetDate to YYYY-MM-DD for date input
      const dateObj = new Date(initialData.targetDate);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      setTargetDate(`${year}-${month}-${day}`);
      setIcon(initialData.icon || '💰');
      setColor(initialData.color || '#3b82f6');
    } else {
      setName('');
      setTargetAmount('');
      // Default to 1 year from now
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const year = oneYearLater.getFullYear();
      const month = String(oneYearLater.getMonth() + 1).padStart(2, '0');
      const day = String(oneYearLater.getDate()).padStart(2, '0');
      setTargetDate(`${year}-${month}-${day}`);
      setIcon('💰');
      setColor('#3b82f6');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Veuillez saisir un nom');
    if (!targetAmount || parseFloat(targetAmount) <= 0) return toast.error('Montant cible invalide');
    if (!targetDate) return toast.error('Veuillez sélectionner une date cible');

    try {
      await onSave({
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        targetDate: new Date(targetDate).toISOString(),
        icon,
        color
      });
      toast.success(initialData ? 'Objectif d\'épargne modifié' : 'Objectif d\'épargne créé');
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
  const icons = [
    // Finance
    '💰', '🐷', '💳', '💎', '💵', '🪙', 
    // Logement
    '🏠', '🛋️', '🔑', '🏡', '🔨', '🏢', 
    // Transports
    '🚗', '🚲', '🏍️', '🛹', '✈️', '⛵',
    // Loisirs / Voyages
    '🏝️', '🏕️', '⛰️', '🌍', '🎫', '📸', 
    // Événements
    '💍', '👶', '🎁', '🎄', '🥳', '🧸',
    // Tech & Média
    '💻', '📱', '🎮', '🎧', '📷',
    // Études / Projets
    '🎓', '📚', '💼', '🚀', '🎨', '🎸',
    // Santé & Sport
    '🏥', '🏃', '🧘', '🩺', '🍕'
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier l\'objectif' : 'Nouvel objectif d\'épargne'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom de l'objectif"
          placeholder="Ex: Fonds de secours, Apport maison..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 text-sm text-secondary font-medium block">Cible (€)</label>
            <input
              type="number"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary font-mono text-lg focus:outline-none focus:border-accent"
              placeholder="Ex: 5000"
              required
            />
          </div>
          <div className="flex-1">
            <label className="mb-2 text-sm text-secondary font-medium block">Date cible</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (err) {}
              }}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none focus:border-accent"
              required
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Sélectionner une icône</label>
          <div className="flex flex-wrap gap-3 p-3 bg-surface-2/60 rounded-2xl border border-border/40 max-h-[110px] overflow-y-auto">
            {icons.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${icon === i ? 'bg-accent/20 border border-accent/40 scale-110' : 'hover:bg-surface-2'}`}
              >
                {i}
              </button>
            ))}
          </div>
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
            {initialData ? 'Enregistrer les modifications' : 'Créer l\'objectif'}
          </Button>

          {initialData && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer cet objectif ? Les versements associés ne seront pas supprimés mais seront détachés de cet objectif.")) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Objectif d\'épargne supprimé');
                    onClose();
                  } catch (e) {
                    toast.error('Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
            >
              Supprimer l'objectif
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default SavingsGoalFormSheet;
