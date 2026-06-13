import React, { useState } from 'react';
import { useTags } from '../../hooks/useTags';
import { getContrastColor } from '../../pages/Tags';
import { Search, Plus, Check, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

const TagSelector = ({ selectedTagIds = [], onChange }) => {
  const { tags, addTag } = useTags();
  const [search, setSearch] = useState('');

  const colors = [
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
    '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e',
    '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#64748b'
  ];

  const handleToggleTag = (tagId) => {
    let updated;
    if (selectedTagIds.includes(tagId)) {
      updated = selectedTagIds.filter(id => id !== tagId);
    } else {
      updated = [...selectedTagIds, tagId];
    }
    onChange(updated);
  };

  const handleCreateTag = async () => {
    const cleanSearch = search.trim();
    if (!cleanSearch) return;

    // Check duplicates case insensitively on frontend
    const exists = tags.some(t => t.name.toLowerCase() === cleanSearch.toLowerCase());
    if (exists) {
      toast.error('Ce tag existe déjà.');
      return;
    }

    try {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const newTag = await addTag({ name: cleanSearch, color: randomColor });
      
      // Select the newly created tag
      onChange([...selectedTagIds, newTag._id]);
      setSearch('');
      toast.success(`Tag "${cleanSearch}" créé et sélectionné`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création du tag');
    }
  };

  const filteredTags = tags.filter(tag => {
    const isSelected = selectedTagIds.includes(tag._id);
    const matchesSearch = tag.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!tag.isArchived || isSelected);
  });

  const exactMatch = tags.some(tag =>
    tag.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs text-secondary font-medium">Étiquettes (Projets / Événements)</label>
        {selectedTagIds.length > 0 && (
          <span className="text-[10px] text-accent font-bold">
            {selectedTagIds.length} sélectionné{selectedTagIds.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Rechercher ou créer un tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-xs text-primary focus:outline-none focus:border-accent placeholder-muted"
        />
      </div>

      {/* Tags Pill Wrap List */}
      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto no-scrollbar py-1">
        {filteredTags.map(tag => {
          const isSelected = selectedTagIds.includes(tag._id);
          const bgColor = isSelected ? tag.color : 'rgba(255,255,255,0.03)';
          const borderColor = isSelected ? 'transparent' : 'rgba(255,255,255,0.08)';
          const textColor = isSelected ? getContrastColor(tag.color) : 'var(--color-text-secondary)';

          return (
            <button
              key={tag._id}
              type="button"
              onClick={() => handleToggleTag(tag._id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 select-none ${
                tag.isArchived ? 'opacity-60 hover:opacity-80' : ''
              }`}
              style={{
                backgroundColor: bgColor,
                borderColor: borderColor,
                color: textColor
              }}
            >
              {isSelected && <Check size={10} className="shrink-0 animate-fadeIn" />}
              {!isSelected && (
                <span 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: tag.color }} 
                />
              )}
              {tag.name}
              {tag.isArchived && <Archive size={9} className="shrink-0 text-current" />}
            </button>
          );
        })}

        {/* Create Tag Option inline */}
        {search.trim() && !exactMatch && (
          <button
            type="button"
            onClick={handleCreateTag}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border border-accent/30 bg-accent/8 text-accent hover:bg-accent/12 active:scale-95 focus:outline-none select-none animate-fadeIn"
          >
            <Plus size={11} className="shrink-0" />
            Créer "{search.trim()}"
          </button>
        )}

        {filteredTags.length === 0 && !search.trim() && (
          <p className="text-[10px] text-muted italic w-full text-center py-2">
            Aucun tag disponible. Tapez ci-dessus pour en créer un.
          </p>
        )}
      </div>
    </div>
  );
};

export default TagSelector;
