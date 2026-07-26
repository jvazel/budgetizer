import React from 'react';
import BottomSheet from '../ui/BottomSheet';
import Select from '../ui/Select';
import { Filter, RotateCcw, Bookmark, Trash2, Calendar, Save, Check, X } from 'lucide-react';
import { getContrastColor } from '../../pages/Tags';

export interface AccountItem {
  _id: string;
  name: string;
}

export interface CategoryItem {
  _id: string;
  name: string;
  icon?: string;
  type: string;
}

export interface TagItem {
  _id: string;
  name: string;
  color: string;
}

export interface SavedFilterItem {
  _id: string;
  name: string;
  filters: {
    search?: string;
    accountId?: string;
    categoryId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    tags?: string;
  };
}

interface TransactionFiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Filter states
  type: string;
  setType: (val: string) => void;
  accountId: string;
  setAccountId: (val: string) => void;
  categoryId: string;
  setCategoryId: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  selectedTags: string[];
  setSelectedTags: (val: string[]) => void;
  setPeriod: (val: string) => void;
  handleResetFilters: () => void;
  // Data collections
  accounts: AccountItem[];
  categories: CategoryItem[];
  tags: TagItem[];
  // Saved Filters
  savedFilters: SavedFilterItem[];
  activeSavedFilterId: string | null;
  handleLoadFilter: (sf: SavedFilterItem) => void;
  handleDeleteFilter: (sf: SavedFilterItem) => void;
  handleUpdateFilter: () => void;
  isSavingFilter: boolean;
  setIsSavingFilter: (val: boolean) => void;
  newFilterName: string;
  setNewFilterName: (val: string) => void;
  handleSaveFilterSubmit: (e: React.FormEvent) => void;
}

export const TransactionFiltersSheet: React.FC<TransactionFiltersSheetProps> = ({
  isOpen,
  onClose,
  type,
  setType,
  accountId,
  setAccountId,
  categoryId,
  setCategoryId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedTags,
  setSelectedTags,
  setPeriod,
  handleResetFilters,
  accounts,
  categories,
  tags,
  savedFilters,
  activeSavedFilterId,
  handleLoadFilter,
  handleDeleteFilter,
  handleUpdateFilter,
  isSavingFilter,
  setIsSavingFilter,
  newFilterName,
  setNewFilterName,
  handleSaveFilterSubmit
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 pt-1">
        {/* Filter title / Reset button */}
        <div className="flex justify-between items-center pb-2 border-b border-border/20">
          <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Filter size={14} className="text-accent" /> Filtres Avancés
          </h3>
          <button 
            onClick={handleResetFilters}
            className="text-[10px] font-bold text-muted hover:text-danger flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={10} /> Réinitialiser
          </button>
        </div>

        {/* Saved Filters Dropdown */}
        {savedFilters.length > 0 && (
          <div className="space-y-1 pb-1">
            <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
              <Bookmark size={10} className="text-accent" /> Charger un filtre enregistré
            </label>
            <div className="flex gap-2">
              <Select
                value={activeSavedFilterId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id === '') {
                    handleResetFilters();
                  } else {
                    const sf = savedFilters.find(f => f._id === id);
                    if (sf) handleLoadFilter(sf);
                  }
                }}
                className="flex-1 bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
              >
                <option value="">-- Choisir un filtre --</option>
                {[...savedFilters]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(sf => (
                    <option key={sf._id} value={sf._id}>
                      {sf.name}
                    </option>
                  ))
                }
              </Select>
              
              {activeSavedFilterId && (
                <button
                  type="button"
                  onClick={() => {
                    const sf = savedFilters.find(f => f._id === activeSavedFilterId);
                    if (sf) handleDeleteFilter(sf);
                  }}
                  className="px-3 py-2 rounded-xl bg-surface border border-border/40 text-muted hover:text-danger hover:border-danger/35 transition-colors focus:outline-none flex items-center justify-center shadow-sm"
                  title="Supprimer ce filtre"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Selection Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Filter by Type */}
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-bold text-muted uppercase">Type de flux</label>
            <div className="flex bg-surface p-1 rounded-xl border border-border/40 gap-1 select-none">
              {[
                { key: '', label: 'Tous' },
                { key: 'expense', label: 'Dépenses', colorClass: 'bg-danger' },
                { key: 'income', label: 'Revenus', colorClass: 'bg-accent' },
                { key: 'transfer', label: 'Virements', colorClass: 'bg-info' }
              ].map((opt) => {
                const isSelected = type === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setType(opt.key);
                      setCategoryId('');
                    }}
                    className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-copper text-white shadow-sm font-extrabold'
                        : 'text-secondary hover:text-primary hover:bg-border/10'
                    }`}
                  >
                    {opt.colorClass && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.colorClass}`} />
                    )}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter by Account */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Compte bancaire</label>
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              align="right"
              className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
            >
              <option value="">Tous les comptes</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>{acc.name}</option>
              ))}
            </Select>
          </div>

          {/* Filter by Category */}
          {type !== 'transfer' && (
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted uppercase">Catégorie</label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
              >
                <option value="">Toutes les catégories</option>
                {categories
                  .filter(cat => !type || cat.type === type)
                  .map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))
                }
              </Select>
            </div>
          )}

          {/* Filter by Tag */}
          {tags && tags.length > 0 && (
            <div className="space-y-1.5 col-span-2 pb-1">
              <label className="text-[10px] font-bold text-muted uppercase">Filtrer par Étiquettes</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar py-0.5">
                {tags.map(tag => {
                  const isSelected = selectedTags.includes(tag._id);
                  const textColor = isSelected ? getContrastColor(tag.color) : 'var(--color-text-secondary)';
                  return (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(selectedTags.filter(id => id !== tag._id));
                        } else {
                          setSelectedTags([...selectedTags, tag._id]);
                        }
                      }}
                      className="px-3 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 select-none"
                      style={{
                        backgroundColor: isSelected ? tag.color : 'rgba(255, 255, 255, 0.03)',
                        color: textColor,
                        borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-1">
            <label 
              htmlFor="startDateFilter"
              className="text-[10px] font-bold text-muted uppercase flex items-center gap-1 cursor-pointer hover:text-secondary transition-colors"
            >
              <Calendar size={10} /> Du
            </label>
            <input
              id="startDateFilter"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod('all');
              }}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch {
                  // Ignore if showPicker is not supported
                }
              }}
              onFocus={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch {
                  // Ignore if showPicker is not supported
                }
              }}
              className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label 
              htmlFor="endDateFilter"
              className="text-[10px] font-bold text-muted uppercase flex items-center gap-1 cursor-pointer hover:text-secondary transition-colors"
            >
              <Calendar size={10} /> Au
            </label>
            <input
              id="endDateFilter"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod('all');
              }}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch {
                  // Ignore if showPicker is not supported
                }
              }}
              onFocus={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch {
                  // Ignore if showPicker is not supported
                }
              }}
              className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Save / Update Filter action */}
        <div className="pt-2 border-t border-border/20 flex flex-col gap-2">
          {!isSavingFilter ? (
            <div className="flex gap-2 justify-end text-xs">
              {activeSavedFilterId && (
                <button
                  type="button"
                  onClick={handleUpdateFilter}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-border/30 border border-border/45 text-primary transition-colors font-bold"
                >
                  <RotateCcw size={13} className="text-purple" />
                  Mettre à jour "{savedFilters.find(f => f._id === activeSavedFilterId)?.name}"
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSavingFilter(true);
                  setNewFilterName(activeSavedFilterId ? `${savedFilters.find(f => f._id === activeSavedFilterId)?.name} (copie)` : '');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-border/30 border border-border/45 text-accent font-bold transition-colors"
              >
                <Save size={13} />
                {activeSavedFilterId ? 'Enregistrer sous...' : 'Enregistrer ce filtre'}
              </button>
            </div>
          ) : (
            <form 
              onSubmit={handleSaveFilterSubmit} 
              className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-border/40 animate-fadeIn"
            >
              <input
                type="text"
                placeholder="Nom du filtre (ex: Courses de Mai)"
                value={newFilterName}
                onChange={e => setNewFilterName(e.target.value)}
                className="flex-1 bg-transparent text-xs text-primary focus:outline-none placeholder-muted px-2 font-semibold"
                required
                autoFocus
              />
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent-dim transition-colors"
                title="Enregistrer"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSavingFilter(false);
                  setNewFilterName('');
                }}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-border/40 text-secondary transition-colors"
                title="Annuler"
              >
                <X size={14} />
              </button>
            </form>
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-copper hover:bg-copper-hover text-white rounded-2xl text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-copper/10 active-spring-sm"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default TransactionFiltersSheet;
