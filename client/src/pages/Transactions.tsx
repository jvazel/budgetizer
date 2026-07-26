import React, { useState, useContext, useMemo } from 'react';
import { HeaderPortalContext } from '../components/layout/AppShell';
import TransactionList from '../components/transactions/TransactionList';
import TransactionHeader from '../components/transactions/TransactionHeader';
import TransactionFiltersSheet from '../components/transactions/TransactionFiltersSheet';
import { useTransactions, TransactionItem } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useSavedFilters, SavedFilter } from '../hooks/useSavedFilters';
import { useTags } from '../hooks/useTags';
import toast from 'react-hot-toast';
import TransactionFormSheet from '../components/transactions/TransactionFormSheet';
import ConfirmModal from '../components/ui/ConfirmModal';

const Transactions: React.FC = () => {
  const { isScrolled } = useContext(HeaderPortalContext);
  // Navigation / Visibility states
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<TransactionItem | null>(null);
  const [filterToDelete, setFilterToDelete] = useState<SavedFilter | null>(null);
  const [confirmDeleteFilterOpen, setConfirmDeleteFilterOpen] = useState(false);

  // Filter state values
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [period, setPeriod] = useState('month'); // month, YYYY-MM, or all
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);

  // Saved Filters states
  const { savedFilters, addSavedFilter, updateSavedFilter, deleteSavedFilter } = useSavedFilters();
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  // Build reactive filters object
  const activeFilters: Record<string, string> = {};
  if (search) activeFilters.search = search;
  if (accountId) activeFilters.accountId = accountId;
  if (categoryId) activeFilters.categoryId = categoryId;
  if (type) activeFilters.type = type;
  if (selectedTags.length > 0) activeFilters.tags = selectedTags.join(',');

  // Resolve dates based on selected period
  if (period !== 'all') {
    let year: number, month: number;
    if (period === 'month') {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    } else {
      const [y, m] = period.split('-').map(Number);
      year = y;
      month = m;
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    activeFilters.startDate = formatDate(start);
    activeFilters.endDate = formatDate(end);
  } else {
    if (startDate) activeFilters.startDate = startDate;
    if (endDate) activeFilters.endDate = endDate;
  }

  const isCurrentMonth = () => {
    if (period === 'month') return true;
    const currentD = new Date();
    const currentKey = `${currentD.getFullYear()}-${String(currentD.getMonth() + 1).padStart(2, '0')}`;
    return period === currentKey;
  };

  const handlePrevMonth = () => {
    let year: number, month: number;
    if (period === 'month') {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    } else if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, m] = period.split('-').map(Number);
      year = y;
      month = m;
    } else {
      return;
    }

    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
    setPeriod(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (isCurrentMonth()) return;
    let year: number, month: number;
    if (period === 'month') {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    } else if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, m] = period.split('-').map(Number);
      year = y;
      month = m;
    } else {
      return;
    }

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    const newPeriod = `${year}-${String(month).padStart(2, '0')}`;
    const currentD = new Date();
    const currentKey = `${currentD.getFullYear()}-${String(currentD.getMonth() + 1).padStart(2, '0')}`;
    if (newPeriod === currentKey) {
      setPeriod('month');
    } else {
      setPeriod(newPeriod);
    }
  };

  const formatPeriodLabel = (p: string) => {
    if (p === 'month') return 'Ce mois';
    if (p === 'all') return 'Toutes les dates';
    const [year, month] = p.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const formatted = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const generateRecentMonthsGrouped = () => {
    const groups: Record<string, Array<{ key: string; label: string }>> = {};
    const current = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = d.getFullYear().toString();
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push({ key, label: capitalizedLabel });
    }
    return groups;
  };

  // Retrieve data using hooks
  const { transactions, loading, deleteTransaction } = useTransactions(activeFilters);
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { tags } = useTags();

  // Load a saved filter
  const handleLoadFilter = (sf: SavedFilter) => {
    setActiveSavedFilterId(sf._id);
    setSearch(sf.filters.search || '');
    setAccountId(sf.filters.accountId || '');
    setCategoryId(sf.filters.categoryId || '');
    setType(sf.filters.type || '');
    setStartDate(sf.filters.startDate || '');
    setEndDate(sf.filters.endDate || '');
    setSelectedTags(sf.filters.tags ? sf.filters.tags.split(',') : []);
    if (sf.filters.startDate || sf.filters.endDate) {
      setPeriod('all');
    } else {
      setPeriod('month');
    }
  };

  // Reset all filters helper
  const handleResetFilters = () => {
    setSearch('');
    setAccountId('');
    setCategoryId('');
    setType('');
    setStartDate('');
    setEndDate('');
    setSelectedTags([]);
    setPeriod('month');
    setActiveSavedFilterId(null);
    setNewFilterName('');
    setIsSavingFilter(false);
    setShowFilters(false);
    setShowSearch(false);
  };

  // Save new filter handler
  const handleSaveFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;
    try {
      const saved = await addSavedFilter(newFilterName.trim(), activeFilters);
      setActiveSavedFilterId(saved._id);
      setIsSavingFilter(false);
      setNewFilterName('');
      toast.success('Filtre enregistré');
    } catch (_err) {
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
    } catch (_err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Delete saved filter handler
  const handleDeleteFilter = (sf: SavedFilter) => {
    setFilterToDelete(sf);
    setConfirmDeleteFilterOpen(true);
  };

  const handleConfirmDeleteFilter = async () => {
    if (!filterToDelete) return;
    try {
      await deleteSavedFilter(filterToDelete._id);
      if (activeSavedFilterId === filterToDelete._id) {
        setActiveSavedFilterId(null);
      }
      toast.success('Filtre supprimé');
    } catch (_err) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setConfirmDeleteFilterOpen(false);
      setFilterToDelete(null);
    }
  };

  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const count = (transactions || []).length;

    (transactions || []).forEach(tx => {
      const amount = Number(tx.amount || 0);
      if (tx.type === 'income') {
        income += amount;
      } else if (tx.type === 'expense') {
        expenses += amount;
      }
    });

    return {
      income,
      expenses,
      net: income - expenses,
      count
    };
  }, [transactions]);

  return (
    <>
      <TransactionHeader
        isScrolled={isScrolled}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        search={search}
        setSearch={setSearch}
        period={period}
        setPeriod={setPeriod}
        isMonthSheetOpen={isMonthSheetOpen}
        setIsMonthSheetOpen={setIsMonthSheetOpen}
        stats={stats}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        isCurrentMonth={isCurrentMonth}
        formatPeriodLabel={formatPeriodLabel}
        generateRecentMonthsGrouped={generateRecentMonthsGrouped}
      />

      <div className="mt-4">
        {/* Real-time Loader / Transactions lists output */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <TransactionList 
            transactions={transactions} 
            onEdit={(tx) => { setSelectedTransaction(tx); setIsEditOpen(true); }}
            onDelete={(tx) => { setTxToDelete(tx); setConfirmDeleteOpen(true); }}
            showFiltersActive={Object.keys(activeFilters).length > (period !== 'all' ? 2 : 0)}
          />
        )}
      </div>

      {/* Advanced Filters BottomSheet */}
      <TransactionFiltersSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        type={type}
        setType={setType}
        accountId={accountId}
        setAccountId={setAccountId}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        setPeriod={setPeriod}
        handleResetFilters={handleResetFilters}
        accounts={accounts}
        categories={categories}
        tags={tags}
        savedFilters={savedFilters}
        activeSavedFilterId={activeSavedFilterId}
        handleLoadFilter={handleLoadFilter}
        handleDeleteFilter={handleDeleteFilter}
        handleUpdateFilter={handleUpdateFilter}
        isSavingFilter={isSavingFilter}
        setIsSavingFilter={setIsSavingFilter}
        newFilterName={newFilterName}
        setNewFilterName={setNewFilterName}
        handleSaveFilterSubmit={handleSaveFilterSubmit}
      />

      {/* Global Transaction Edit Form Sheet */}
      <TransactionFormSheet
        isOpen={isEditOpen}
        onClose={() => { setSelectedTransaction(null); setIsEditOpen(false); }}
        transactionToEdit={selectedTransaction}
      />

      {/* Confirmation Dialog Delete Transaction */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => { setTxToDelete(null); setConfirmDeleteOpen(false); }}
        onConfirm={async () => {
          if (!txToDelete) return;
          try {
            await deleteTransaction(txToDelete._id);
            toast.success('Transaction supprimée');
          } catch (_err) {
            toast.error('Erreur lors de la suppression');
          } finally {
            setTxToDelete(null);
            setConfirmDeleteOpen(false);
          }
        }}
        title="Supprimer la transaction ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      >
        {txToDelete && (
          <p className="text-xs text-secondary leading-relaxed">
            Es-tu sûr de vouloir supprimer la transaction <span className="text-primary font-semibold">"{txToDelete.description || txToDelete.note || txToDelete.categoryId?.name || (txToDelete.type === 'transfer' ? 'Virement' : 'Transaction')}"</span> d'un montant de <span className="text-danger font-mono font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(txToDelete.amount)}</span> ?
            <br />
            <br />
            Cette action est irréversible et réajustera le solde de ton compte.
          </p>
        )}
      </ConfirmModal>

      {/* Confirmation Dialog Delete Saved Filter */}
      <ConfirmModal
        isOpen={confirmDeleteFilterOpen}
        onClose={() => { setFilterToDelete(null); setConfirmDeleteFilterOpen(false); }}
        onConfirm={handleConfirmDeleteFilter}
        title="Supprimer le filtre enregistré ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      >
        {filterToDelete && (
          <p className="text-xs text-secondary leading-relaxed">
            Es-tu sûr de vouloir supprimer le filtre enregistré <span className="text-primary font-semibold">"{filterToDelete.name}"</span> ?
            <br />
            <br />
            Cette action est définitive et irréversible.
          </p>
        )}
      </ConfirmModal>
    </>
  );
};

export default Transactions;
