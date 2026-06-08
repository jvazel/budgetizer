import React, { useState } from 'react';
import { HeaderTitle, HeaderActions } from '../components/layout/AppShell';
import TransactionList from '../components/transactions/TransactionList';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useSavedFilters } from '../hooks/useSavedFilters';
import toast from 'react-hot-toast';
import { Filter, Search, X, RotateCcw, Calendar, Save, Bookmark, Check, Trash2 } from 'lucide-react';
import TransactionFormSheet from '../components/transactions/TransactionFormSheet';
import ConfirmModal from '../components/ui/ConfirmModal';

const Transactions = () => {
  // Navigation / Visibility states
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  // Filter state values
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Saved Filters states
  const { savedFilters, addSavedFilter, updateSavedFilter, deleteSavedFilter } = useSavedFilters();
  const [activeSavedFilterId, setActiveSavedFilterId] = useState(null);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  // Build reactive filters object
  const activeFilters = {};
  if (search) activeFilters.search = search;
  if (accountId) activeFilters.accountId = accountId;
  if (categoryId) activeFilters.categoryId = categoryId;
  if (type) activeFilters.type = type;
  if (startDate) activeFilters.startDate = startDate;
  if (endDate) activeFilters.endDate = endDate;

  // Retrieve data using hooks
  const { transactions, loading, deleteTransaction } = useTransactions(activeFilters);
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  // Load a saved filter
  const handleLoadFilter = (sf) => {
    setActiveSavedFilterId(sf._id);
    setSearch(sf.filters.search || '');
    setAccountId(sf.filters.accountId || '');
    setCategoryId(sf.filters.categoryId || '');
    setType(sf.filters.type || '');
    setStartDate(sf.filters.startDate || '');
    setEndDate(sf.filters.endDate || '');
  };

  // Reset all filters helper
  const handleResetFilters = () => {
    setSearch('');
    setAccountId('');
    setCategoryId('');
    setType('');
    setStartDate('');
    setEndDate('');
    setActiveSavedFilterId(null);
    setNewFilterName('');
    setIsSavingFilter(false);
    setShowFilters(false);
    setShowSearch(false);
  };

  // Save new filter handler
  const handleSaveFilterSubmit = async (e) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;
    try {
      const saved = await addSavedFilter(newFilterName.trim(), activeFilters);
      setActiveSavedFilterId(saved._id);
      setIsSavingFilter(false);
      setNewFilterName('');
      toast.success('Filtre enregistré');
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  // Update existing filter handler
  const handleUpdateFilter = async () => {
    if (!activeSavedFilterId) return;
    const filterToUpdate = savedFilters.find(f => f._id === activeSavedFilterId);
    if (!filterToUpdate) return;
    try {
      await updateSavedFilter(activeSavedFilterId, filterToUpdate.name, activeFilters);
      toast.success('Filtre mis à jour');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Delete saved filter handler
  const handleDeleteFilter = async (sf) => {
    if (window.confirm(`Supprimer le filtre enregistré "${sf.name}" ?`)) {
      try {
        await deleteSavedFilter(sf._id);
        if (activeSavedFilterId === sf._id) {
          setActiveSavedFilterId(null);
        }
        toast.success('Filtre supprimé');
      } catch (err) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const actions = (
    <>
      <button 
        onClick={() => {
          setShowSearch(!showSearch);
          if (showFilters) setShowFilters(false);
        }} 
        className={`hover:text-primary transition-colors p-1 rounded-lg ${showSearch ? 'text-accent' : ''}`}
      >
        <Search size={20} />
      </button>
      <button 
        onClick={() => {
          setShowFilters(!showFilters);
          if (showSearch) setShowSearch(false);
        }} 
        className={`hover:text-primary transition-colors p-1 rounded-lg ${showFilters ? 'text-accent' : ''}`}
      >
        <Filter size={20} />
      </button>
    </>
  );

  return (
    <>
      <HeaderTitle>Transactions</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <div className="mt-4 space-y-4">
        
        {/* Dynamic sliding Search Bar */}
        {showSearch && (
          <div className="bg-surface-2 p-4 rounded-2xl border border-border/40 shadow-sm flex items-center gap-3 animate-fadeIn">
            <Search size={18} className="text-muted flex-shrink-0" />
            <input 
              type="text"
              placeholder="Rechercher (libellé, note, compte, catégorie...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-primary focus:outline-none placeholder-muted"
              autoFocus
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="p-1 rounded-full hover:bg-border/20 text-muted transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Dynamic sliding Advanced Filters section */}
        {showFilters && (
          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4 animate-fadeIn">
            
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
                  <select
                    value={activeSavedFilterId || ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id === '') {
                        handleResetFilters();
                        setShowFilters(true); // Keep filters open
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
                  </select>
                  
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Type de flux</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setCategoryId('');
                  }}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
                >
                  <option value="">Tous les types</option>
                  <option value="expense">Dépenses 🔴</option>
                  <option value="income">Revenus 🟢</option>
                  <option value="transfer">Virements 🔵</option>
                </select>
              </div>

              {/* Filter by Account */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Compte bancaire</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
                >
                  <option value="">Tous les comptes</option>
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Category */}
              {type !== 'transfer' && (
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-muted uppercase">Catégorie</label>
                  <select
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
                  </select>
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
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (err) {}
                  }}
                  onFocus={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (err) {}
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
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (err) {}
                  }}
                  onFocus={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (err) {}
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

          </div>
        )}

        {/* Real-time Loader / Transactions lists output */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div>
            {transactions.length === 0 ? (
              <div className="bg-surface-2 border border-border/40 rounded-[28px] p-8 text-center text-muted">
                <p className="text-xs">Aucune transaction ne correspond à vos critères de recherche.</p>
              </div>
            ) : (
              <TransactionList 
                transactions={transactions} 
                currentAccountId={accountId}
                onDelete={(tx) => {
                  setTxToDelete(tx);
                  setConfirmDeleteOpen(true);
                }} 
                onEdit={(tx) => {
                  setSelectedTransaction(tx);
                  setIsEditOpen(true);
                }}
              />
            )}
          </div>
        )}

      </div>

      <TransactionFormSheet 
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedTransaction(null);
        }}
        transactionToEdit={selectedTransaction}
      />

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setTxToDelete(null);
        }}
        onConfirm={async () => {
          if (txToDelete) {
            await deleteTransaction(txToDelete._id);
          }
          setConfirmDeleteOpen(false);
          setTxToDelete(null);
        }}
        title="Supprimer la transaction ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      >
        {txToDelete && (
          <p className="text-xs text-secondary leading-relaxed">
            Êtes-vous sûr de vouloir supprimer la transaction <span className="text-primary font-semibold">"{txToDelete.description || txToDelete.note || txToDelete.categoryId?.name || (txToDelete.type === 'transfer' ? 'Virement' : 'Transaction')}"</span> d'un montant de <span className="text-danger font-mono font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(txToDelete.amount)}</span> ?
            <br />
            <br />
            Cette action est irréversible et réajustera le solde de votre compte.
          </p>
        )}
      </ConfirmModal>
    </>
  );
};

export default Transactions;

