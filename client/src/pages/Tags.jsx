import React, { useState } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import TagFormSheet from '../components/tags/TagFormSheet';
import { useTags } from '../hooks/useTags';
import { Plus, Tag as TagIcon, Edit2 } from 'lucide-react';

// Helper to determine contrast color (white or black text depending on background hex)
export const getContrastColor = (hex) => {
  if (!hex) return '#ffffff';
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return '#ffffff';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff'; // slate-900 or white
};

const Tags = () => {
  const { tags, loading, addTag, updateTag, deleteTag } = useTags();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);

  const handleAddTag = () => {
    setEditingTag(null);
    setIsFormOpen(true);
  };

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setIsFormOpen(true);
  };

  const actions = (
    <button 
      onClick={handleAddTag}
      className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-accent transition-colors flex items-center justify-center focus:outline-none"
      title="Ajouter un tag"
    >
      <Plus size={18} />
    </button>
  );

  return (
    <>
      <HeaderTitle>Étiquettes</HeaderTitle>
      <HeaderBackButton to="/" />
      <HeaderActions>{actions}</HeaderActions>

      <div className="mt-4 pb-24">
        <p className="text-xs text-muted mb-6 leading-relaxed">
          Les étiquettes (tags) vous permettent de suivre des projets ou des événements spécifiques transversaux (ex: "Voyage Corse 2026") indépendamment des catégories classiques.
        </p>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : tags.length === 0 ? (
          <div className="bg-surface-2 border border-border/40 rounded-[28px] p-8 text-center text-muted">
            <div className="w-12 h-12 rounded-full bg-border/20 flex items-center justify-center mx-auto mb-3 text-secondary">
              <TagIcon size={20} />
            </div>
            <p className="text-xs font-medium">Vous n'avez pas encore créé d'étiquettes.</p>
            <button
              onClick={handleAddTag}
              className="mt-3 text-xs font-bold text-accent hover:underline focus:outline-none"
            >
              Créer ma première étiquette
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tags.map(tag => {
              const textColor = getContrastColor(tag.color);
              return (
                <div
                  key={tag._id}
                  onClick={() => handleEditTag(tag)}
                  className="bg-surface-2 border border-border/40 hover:bg-surface/30 cursor-pointer p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm transition-all duration-200 active:scale-97 select-none group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/10 shadow-sm"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-xs font-bold text-primary truncate" title={tag.name}>
                      {tag.name}
                    </span>
                  </div>
                  
                  <button 
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-border/20 text-muted transition-all duration-200"
                    title="Modifier"
                  >
                    <Edit2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TagFormSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingTag}
        onSave={async (data) => {
          if (editingTag) {
            await updateTag(editingTag._id, data);
          } else {
            await addTag(data);
          }
        }}
        onDelete={async (id) => {
          await deleteTag(id);
        }}
      />
    </>
  );
};

export default Tags;
