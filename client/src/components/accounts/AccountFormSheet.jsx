import React, { useState, useEffect } from 'react';
import BottomSheet from '../ui/BottomSheet';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import CreditAccountBottomSheet from './CreditAccountBottomSheet';

const AccountFormSheet = ({ isOpen, onClose, onSave, onDelete, initialData = null }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#4ade80');
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setBalance(initialData.balance.toString());
      setColor(initialData.color);
      setIncludeInTotal(initialData.includeInTotal);
    } else {
      setName('');
      setType('checking');
      setBalance('');
      setColor('#4ade80');
      setIncludeInTotal(true);
    }
    setSubmitting(false);
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      await onSave({
        name,
        type,
        balance: parseFloat(balance) || 0,
        color,
        includeInTotal
      });
      toast.success(initialData ? 'Compte modifié' : 'Compte créé');
    } catch (error) {
      toast.error('Une erreur est survenue');
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  };

  const colors = ['#4ade80', '#60a5fa', '#a78bfa', '#f87171', '#fbbf24', '#f472b6', '#2dd4bf'];
 
  if (type === 'credit') {
    return (
      <CreditAccountBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        initialData={initialData}
        onSave={onSave}
        onDelete={onDelete}
        onTypeChange={(newType) => setType(newType)}
      />
    );
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary">
          {initialData ? 'Modifier le compte' : 'Nouveau compte'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors">
          <X size={20} className="text-secondary" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nom du compte"
          placeholder="ex: Compte Courant"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Select 
          label="Type de compte"
          value={type} 
          onChange={(e) => setType(e.target.value)}
        >
          <option value="checking">Courant</option>
          <option value="savings">Épargne</option>
          <option value="cash">Espèces</option>
          <option value="credit">Crédit</option>
          <option value="investment">Investissement</option>
        </Select>

        <Input
          label="Solde initial"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="font-mono"
          required
        />

        <div className="flex flex-col">
          <label className="mb-2 text-sm text-secondary font-medium">Couleur</label>
          <div className="flex gap-2">
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

        <div className="flex items-center justify-between py-2">
          <label className="text-sm text-primary font-medium">Inclure dans le solde total</label>
          <input 
            type="checkbox" 
            checked={includeInTotal}
            onChange={(e) => setIncludeInTotal(e.target.checked)}
            className="w-5 h-5 accent-accent"
          />
        </div>

        <div className="pt-4 space-y-3">
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting 
              ? (initialData ? 'Enregistrement...' : 'Création...') 
              : (initialData ? 'Enregistrer les modifications' : 'Créer le compte')}
          </Button>

          {initialData && onDelete && (
            <button
              type="button"
              onClick={async () => {
                const confirmMsg = "Êtes-vous sûr de vouloir supprimer ce compte ?\n\nATTENTION : Cette action supprimera définitivement toutes les transactions (dépenses, recettes, virements) et transactions planifiées qui lui sont associées. Cette action est irréversible.";
                if (window.confirm(confirmMsg)) {
                  try {
                    await onDelete(initialData._id);
                    toast.success('Compte supprimé');
                  } catch (e) {
                    toast.error('Erreur lors de la suppression');
                  }
                }
              }}
              className="w-full h-[52px] rounded-2xl font-bold text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
            >
              Supprimer le compte
            </button>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};

export default AccountFormSheet;
