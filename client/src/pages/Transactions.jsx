import React, { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import TransactionList from '../components/transactions/TransactionList';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { Filter, Search, X, RotateCcw, Calendar } from 'lucide-react';
import TransactionFormSheet from '../components/transactions/TransactionFormSheet';

const Transactions = () => {
  // Navigation / Visibility states
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Filter state values
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // Reset all filters helper
  const handleResetFilters = () => {
    setSearch('');
    setAccountId('');
    setCategoryId('');
    setType('');
    setStartDate('');
    setEndDate('');
    setShowFilters(false);
    setShowSearch(false);
  };

  const header = (
    <div className="w-full flex justify-between items-center">
      <h1 className="text-lg font-bold text-primary">Transactions</h1>
      <div className="flex gap-4 text-muted">
        <button 
          onClick={() => {
            setShowSearch(!showSearch);
            if (showFilters) setShowFilters(false);
          }} 
          className={`hover:text-primary transition-colors p-1 rounded-lg ${showSearch ? 'text-accent' : ''}`}
        >
          <Search size={22} />
        </button>
        <button 
          onClick={() => {
            setShowFilters(!showFilters);
            if (showSearch) setShowSearch(false);
          }} 
          className={`hover:text-primary transition-colors p-1 rounded-lg ${showFilters ? 'text-accent' : ''}`}
        >
          <Filter size={22} />
        </button>
      </div>
    </div>
  );

  return (
    <AppShell header={header}>
      <div className="mt-4 space-y-4">
        
        {/* Dynamic sliding Search Bar */}
        {showSearch && (
          <div className="bg-surface-2 p-4 rounded-2xl border border-border/40 shadow-sm flex items-center gap-3 animate-fadeIn">
            <Search size={18} className="text-muted flex-shrink-0" />
            <input 
              type="text"
              placeholder="Rechercher par description..."
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

            {/* Selection Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Filter by Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Type de flux</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
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
                <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                  <Calendar size={10} /> Du
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                  <Calendar size={10} /> Au
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface border border-border/40 px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none"
                />
              </div>
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
                onDelete={async (id) => {
                  if (window.confirm('Supprimer cette transaction ?')) {
                    await deleteTransaction(id);
                  }
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
    </AppShell>
  );
};

export default Transactions;
