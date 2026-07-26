import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const TagFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isArchived, setIsArchived] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setColor(initialData.color);
      setIsArchived(initialData.isArchived || false);
    } else {
      setName('');
      setColor('#3b82f6'); // Default color
      setIsArchived(false);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Le nom du tag est requis.');
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        color,
        isArchived
      });
      toast.success(initialData ? 'Tag modifié' : 'Tag créé');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Une erreur est survenue');
    }
  };

  const colors = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
    '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e',
    '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier le tag' : 'Nouveau tag'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Input
            label="Nom de l'étiquette"
            placeholder="Ex: Vacances_Corse_2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur du Badge</label>
          <div className="grid grid-cols-6 gap-3 p-3 bg-surface-2 border border-border rounded-2xl">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full mx-auto transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface-2' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {initialData && (
          <div className="flex items-center justify-between p-4 bg-surface-2 border border-border rounded-2xl">
            <div className="flex flex-col pr-4">
              <span className="text-sm font-semibold text-primary">Archiver l'étiquette</span>
              <span className="text-[11px] text-muted leading-relaxed mt-0.5">
                Masque cette étiquette lors de la saisie de dépenses. L'historique reste intact.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsArchived(!isArchived)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isArchived ? 'bg-accent' : 'bg-border/60'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isArchived ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        <div className="pt-4 space-y-3">
          <Button type="submit" fullWidth>
            {initialData ? 'Enregistrer les modifications' : 'Créer le tag'}
          </Button>

          {initialData && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Supprimer ce tag ? Il sera retiré de toutes les transactions (sans les supprimer).")) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Tag supprimé');
                    onClose();
                  } catch (e) {
                    toast.error(e.response?.data?.message || 'Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors focus:outline-none"
            >
              Supprimer le tag
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default TagFormSheet;
