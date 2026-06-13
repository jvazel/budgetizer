import React, { useState } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import TagFormSheet from '../components/tags/TagFormSheet';
import { useTags } from '../hooks/useTags';
import { Plus, Tag as TagIcon, Edit2, Archive } from 'lucide-react';

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
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'archived'

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

  const activeTags = tags.filter(tag => !tag.isArchived);
  const archivedTags = tags.filter(tag => tag.isArchived);

  const renderTagGrid = (tagsList, isArchivedSection = false) => (
    <div className="grid grid-cols-2 gap-3">
      {tagsList.map(tag => {
        return (
          <div
            key={tag._id}
            onClick={() => handleEditTag(tag)}
            className={`bg-surface-2 border border-border/40 hover:bg-surface/30 cursor-pointer p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm transition-all duration-200 active:scale-97 select-none group ${
              isArchivedSection ? 'opacity-60 hover:opacity-80' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span 
                className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/10 shadow-sm"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-xs font-bold text-primary truncate flex items-center gap-1.5" title={tag.name}>
                {tag.name}
                {isArchivedSection && <Archive size={11} className="text-muted shrink-0" />}
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
  );

  return (
    <>
      <HeaderTitle>Étiquettes</HeaderTitle>
      <HeaderBackButton to="/" />
      <HeaderActions>{actions}</HeaderActions>

      <div className="mt-4 mb-6">
        <p className="text-xs text-muted mb-6 leading-relaxed">
          Les étiquettes (tags) vous permettent de suivre des projets ou des événements spécifiques transversaux (ex: "Voyage Corse 2026") indépendamment des catégories classiques.
        </p>

        {/* Tabs Filtrage */}
        {!loading && tags.length > 0 && (
          <div className="flex bg-surface-2 p-1 rounded-2xl mb-6 select-none border border-border/40">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
                filter === 'all' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              Tous ({tags.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
                filter === 'active' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              Actifs ({activeTags.length})
            </button>
            <button
              onClick={() => setFilter('archived')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
                filter === 'archived' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              Archivés ({archivedTags.length})
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-surface-2/40 rounded-[24px] border border-border/20 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-surface border border-border/40 flex items-center justify-center text-accent mb-4 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 rounded-full blur-md" />
              <TagIcon className="text-accent relative z-10" size={20} />
            </div>
            <p className="text-primary text-xs font-bold mb-1">Aucune étiquette</p>
            <p className="text-muted text-[10px] max-w-[200px] mb-3">Créez des tags pour suivre des projets ou événements transversaux.</p>
            <button 
              onClick={handleAddTag}
              className="py-2.5 px-4 bg-accent text-white font-bold text-xs rounded-xl shadow-md shadow-accent/20 active:scale-95 transition-all focus:outline-none"
            >
              Créer une étiquette
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filter === 'active' && (
              activeTags.length > 0 ? (
                renderTagGrid(activeTags, false)
              ) : (
                <p className="text-center text-muted text-xs py-8 italic">Aucune étiquette active.</p>
              )
            )}

            {filter === 'archived' && (
              archivedTags.length > 0 ? (
                renderTagGrid(archivedTags, true)
              ) : (
                <p className="text-center text-muted text-xs py-8 italic">Aucune étiquette archivée.</p>
              )
            )}

            {filter === 'all' && (
              archivedTags.length > 0 ? (
                <>
                  {activeTags.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-secondary pl-1">Actives</h3>
                      {renderTagGrid(activeTags, false)}
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t border-border/20">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted pl-1">Archivées</h3>
                    {renderTagGrid(archivedTags, true)}
                  </div>
                </>
              ) : (
                renderTagGrid(activeTags, false)
              )
            )}
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
