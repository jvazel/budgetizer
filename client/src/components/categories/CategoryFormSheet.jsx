import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const CategoryFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null, initialType = 'expense', initialParentId = null }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#8b5cf6');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setIcon(initialData.icon);
      setColor(initialData.color);
    } else {
      setName('');
      setType(initialType);
      setIcon('📁');
      setColor('#8b5cf6');
    }
  }, [initialData, isOpen, initialType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave({
        name,
        type,
        icon,
        color,
        parentId: initialData ? initialData.parentId : initialParentId
      });
      toast.success(initialData ? 'Catégorie modifiée' : 'Catégorie créée');
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
  };

  const colors = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
    '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e',
    '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
  ];

  const popularIcons = [
    // Alimentation & Boisson
    '🍔', '🍕', '🍽️', '☕', '🍺', '🍷', '🥐', '🛒',
    // Logement & Factures
    '🏠', '🛋️', '🔑', '⚡', '🚰', '📶', '📡', '🧹', '🔨',
    // Transport & Voyage
    '🚗', '🚌', '🚇', '✈️', '🚲', '🏍️', '⛽', '🚕', '🅿️',
    // Santé & Hygiène
    '🏥', '💊', '🩺', '🦷', '👓', '🧘', '💈', '🧴',
    // Loisirs & Culture
    '🎭', '🎬', '🎤', '🎧', '🎮', '📚', '🎫', '🎳', '🎡', '🏕️', '⚽', '🏋️',
    // Shopping & Cadeaux
    '👕', '👗', '👟', '👜', '🕶️', '🛍️', '🎁', '🧸',
    // Finances & Professionnel
    '💰', '💵', '🪙', '💼', '📈', '🔄', '🏦', '💻', '⚙️',
    // Famille & Animaux
    '👶', '🍼', '🐱', '🐶', '🐾', '🏫'
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="flex gap-4">
          <div className="w-16">
            <label className="mb-2 text-sm text-secondary font-medium block">Icône</label>
            <div className="w-full h-[52px] bg-surface-2 border border-border rounded-2xl flex items-center justify-center text-2xl">
               {icon}
            </div>
          </div>
          <div className="flex-1">
             <Input
                label="Nom de la catégorie"
                placeholder="Ex: Loisirs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Choisir un emoji</label>
          <div className="flex flex-wrap gap-2 p-3 bg-surface-2 border border-border rounded-2xl h-32 overflow-y-auto no-scrollbar">
            {popularIcons.map(ic => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${icon === ic ? 'bg-accent/20' : 'hover:bg-surface'}`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {!initialParentId && !initialData?.parentId && (
          <div className="flex flex-col">
            <label className="mb-2 text-sm text-secondary font-medium">Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full h-[52px] px-4 bg-surface-2 border border-border rounded-2xl text-primary focus:outline-none focus:border-accent"
              disabled={initialData?.isDefault}
            >
              <option value="expense">Dépense</option>
              <option value="income">Revenu</option>
              <option value="both">Les deux</option>
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur</label>
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
            {initialData ? 'Enregistrer les modifications' : 'Créer la catégorie'}
          </Button>

          {initialData && onDelete && !initialData.isDefault && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Catégorie supprimée');
                  } catch (e) {
                    toast.error(e.response?.data?.message || 'Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
            >
              Supprimer la catégorie
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default CategoryFormSheet;
