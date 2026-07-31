import React, { useState, useContext, useMemo } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton, HeaderPortalContext } from '../components/layout/AppShell';
import { useRules } from '../hooks/useRules';
import { RuleFormSheet } from '../components/rules/RuleFormSheet';
import { ICategorizationRule } from '@budgetizer/shared';
import { Plus, Sliders, ArrowUp, ArrowDown, Trash2, Edit2, CheckCircle, Sparkles, Wand2, Search, Filter, X } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import AiBadge from '../components/ui/AiBadge';
import Select from '../components/ui/Select';

export const RulesSettingsPage: React.FC = () => {
  const { rules, suggestions, isLoading, addRule, editRule, removeRule, reorder } = useRules();
  const { categories } = useCategories();
  const { isScrolled } = useContext(HeaderPortalContext);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ICategorizationRule | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'autoReview'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const getCategoryName = (catId?: string | null) => {
    if (!catId) return null;
    const cat = categories.find(c => c._id === catId);
    return cat ? `${cat.icon || '📁'} ${cat.name}` : null;
  };

  const handleOpenNew = () => {
    setSelectedRule(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (rule: ICategorizationRule) => {
    setSelectedRule(rule);
    setIsSheetOpen(true);
  };

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const newOrder = [...rules];
    const temp = newOrder[index];
    newOrder[index] = newOrder[newIndex];
    newOrder[newIndex] = temp;

    reorder(newOrder.map(r => r._id));
  };

  const handleCreateFromSuggestion = (suggestion: { descriptionKeyword: string; categoryId: string }) => {
    addRule({
      name: `Règle ${suggestion.descriptionKeyword}`,
      conditions: [{ field: 'description', operator: 'contains', value: suggestion.descriptionKeyword }],
      actions: { categoryId: suggestion.categoryId, autoReview: true },
      applyRetroactively: true
    });
  };

  // Filtered rules computation
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = rule.name.toLowerCase().includes(query);
        const matchesCondition = rule.conditions.some(c => c.value.toLowerCase().includes(query));
        const catName = getCategoryName(rule.actions.categoryId);
        const matchesCat = catName ? catName.toLowerCase().includes(query) : false;

        if (!matchesName && !matchesCondition && !matchesCat) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'active' && !rule.isActive) return false;
      if (statusFilter === 'inactive' && rule.isActive) return false;
      if (statusFilter === 'autoReview' && !rule.actions.autoReview) return false;

      // 3. Category Filter
      if (selectedCategoryFilter !== 'all') {
        if (rule.actions.categoryId !== selectedCategoryFilter) return false;
      }

      return true;
    });
  }, [rules, searchQuery, statusFilter, selectedCategoryFilter, categories]);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || selectedCategoryFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedCategoryFilter('all');
  };

  const actions = (
    <button 
      onClick={handleOpenNew}
      className="p-1.5 bg-copper-dim hover:bg-copper/20 rounded-full text-copper transition-colors"
      title="Créer une règle"
    >
      <Plus size={16} />
    </button>
  );

  return (
    <>
      <HeaderTitle collapsible={true}>Règles Intelligentes</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <HeaderBackButton to="/settings" />

      {/* Large Header Title collapsible on scroll */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-copper/10 text-copper flex items-center justify-center">
            <Sliders size={16} />
          </div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">Règles & Automatisation</h1>
        </div>
        <p className="text-[11px] text-secondary font-medium leading-none mt-1.5">
          Automatise la catégorisation et le pointage de tes transactions grâce à des règles intelligentes priorisées.
        </p>
      </div>

      <div className="space-y-5 pb-6">
        {/* Banner Suggestions IA / Smart Rules */}
        {suggestions.length > 0 && (
          <div className="bg-surface-2 p-4 sm:p-5 rounded-[24px] border border-border/40 space-y-3 shadow-sm select-none">
            <div className="flex items-center gap-2">
              <AiBadge text="Suggestions Intelligentes" />
              <span className="text-[10px] text-secondary font-semibold">basées sur tes habitude de saisie</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {suggestions.map((sug, idx) => (
                <div key={idx} className="bg-surface border border-border/40 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="overflow-hidden pr-2 min-w-0">
                    <p className="text-xs font-bold text-primary truncate">"{sug.descriptionKeyword}"</p>
                    <p className="text-[10px] text-secondary font-medium truncate">
                      {getCategoryName(sug.categoryId) || 'Catégorie détectée'} • ({sug.count} fois)
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateFromSuggestion(sug)}
                    className="px-3 py-1.5 bg-copper-dim hover:bg-copper/20 text-copper border border-copper/20 text-[10px] font-bold rounded-xl active:scale-95 transition-all whitespace-nowrap shrink-0"
                  >
                    + Règle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-surface-2 p-3 rounded-[24px] border border-border/40 space-y-3 shadow-sm select-none">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3.5 text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, mot-clé ou catégorie..."
              className="w-full bg-surface border border-border/40 rounded-2xl pl-9 pr-8 py-2 text-xs text-primary placeholder:text-muted font-bold focus:outline-none focus:border-copper/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-0.5 rounded-full hover:bg-surface-2 text-muted hover:text-primary transition-all"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/20">
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'active', label: 'Actives' },
                { id: 'autoReview', label: 'Auto-pointées' },
                { id: 'inactive', label: 'Inactives' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-extrabold border transition-all active:scale-95 whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-copper border-copper text-white shadow-sm shadow-copper/20'
                      : 'bg-surface border-border/40 text-secondary hover:text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {/* Category Filter Select */}
              <Select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="bg-surface border border-border/40 rounded-xl px-2.5 py-1 text-[10px] font-extrabold text-secondary hover:text-primary transition-all"
              >
                <option value="all">Toutes catégories</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.icon || '📁'} {c.name}</option>
                ))}
              </Select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[10px] font-bold text-copper hover:underline flex items-center gap-1 shrink-0"
              >
                <X size={12} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Action Header bar for quick addition */}
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-extrabold text-secondary uppercase tracking-wider">
            {hasActiveFilters ? `Règles filtrées (${filteredRules.length}/${rules.length})` : `Règles configurées (${rules.length})`}
          </h2>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-copper text-white text-xs font-bold shadow-sm shadow-copper/20 hover:bg-copper/90 active:scale-95 transition-all select-none"
          >
            <Plus size={14} />
            <span>Nouvelle règle</span>
          </button>
        </div>

        {/* Rules List */}
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 bg-surface-2 rounded-2xl shimmer-loader" />
            <div className="h-16 bg-surface-2 rounded-2xl shimmer-loader" />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="bg-surface-2 p-8 rounded-[28px] border border-border/40 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border/40 text-muted flex items-center justify-center mx-auto">
              <Filter size={22} />
            </div>
            <h3 className="text-sm font-bold text-primary">
              {hasActiveFilters ? 'Aucune règle ne correspond à tes filtres' : 'Aucune règle configurée'}
            </h3>
            <p className="text-xs text-secondary max-w-sm mx-auto font-medium leading-relaxed">
              {hasActiveFilters 
                ? 'Essaie de modifier tes critères de recherche ou de réinitialiser le filtre.' 
                : 'Crée ta première règle pour attribuer automatiquement une catégorie et pointer tes transactions courantes.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-copper/10 text-copper border border-copper/20 text-xs font-extrabold active:scale-95 transition-all"
              >
                Réinitialiser les filtres
              </button>
            ) : (
              <button
                onClick={handleOpenNew}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-copper/10 text-copper border border-copper/20 text-xs font-extrabold active:scale-95 transition-all"
              >
                <Plus size={14} /> Créer ma première règle
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRules.map((rule, index) => (
              <div
                key={rule._id}
                className={`bg-surface-2 p-4 rounded-[24px] border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-copper/20 transition-all ${
                  !rule.isActive ? 'opacity-50' : ''
                }`}
              >
                {/* Priorité + Nom & Détails */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-surface border border-border/40 text-copper font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    #{rule.priority}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-primary truncate">{rule.name}</h4>
                      {rule.actions.autoReview && (
                        <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          <CheckCircle size={10} /> Auto-Pointé
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-secondary font-semibold">
                      <span className="text-muted text-[10px]">Conditions :</span>
                      {rule.conditions.map((c, i) => (
                        <span key={i} className="bg-surface px-2 py-0.5 rounded-lg border border-border/40 text-primary text-[10px] font-bold">
                          {c.field === 'description' ? 'Libellé' : c.field === 'amount' ? 'Montant' : c.field} {c.operator === 'contains' ? 'contient' : c.operator} "{c.value}"
                        </span>
                      ))}
                      {getCategoryName(rule.actions.categoryId) && (
                        <>
                          <span className="text-muted text-[10px]">➔</span>
                          <span className="text-copper font-extrabold text-[10px]">
                            {getCategoryName(rule.actions.categoryId)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Matchs Count & Action buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/20">
                  <span className="text-[10px] font-bold text-muted bg-surface px-2.5 py-1 rounded-xl border border-border/30 whitespace-nowrap">
                    {rule.matchCount || 0} match(s)
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMovePriority(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-secondary hover:text-primary disabled:opacity-20 rounded-lg hover:bg-surface border border-transparent hover:border-border/30 active:scale-95 transition-all"
                      title="Monter la priorité"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMovePriority(index, 'down')}
                      disabled={index === rules.length - 1}
                      className="p-1.5 text-secondary hover:text-primary disabled:opacity-20 rounded-lg hover:bg-surface border border-transparent hover:border-border/30 active:scale-95 transition-all"
                      title="Descendre la priorité"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-1.5 text-secondary hover:text-copper rounded-lg hover:bg-surface border border-transparent hover:border-border/30 active:scale-95 transition-all"
                      title="Modifier"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => removeRule(rule._id)}
                      className="p-1.5 text-secondary hover:text-rose-400 rounded-lg hover:bg-surface border border-transparent hover:border-border/30 active:scale-95 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sheet Form */}
      <RuleFormSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onSave={async (data) => {
          if (selectedRule) {
            await editRule(selectedRule._id, data);
          } else {
            await addRule(data);
          }
        }}
        initialData={selectedRule}
      />
    </>
  );
};

export default RulesSettingsPage;

