import { useState } from 'react';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import CategoryList from '../components/categories/CategoryList';
import CategoryFormSheet from '../components/categories/CategoryFormSheet';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useCategories } from '../hooks/useCategories';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const Categories = () => {
  const { categoriesTree, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState('expense');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [addingToParentId, setAddingToParentId] = useState(null);
  const [deleteCategoryItem, setDeleteCategoryItem] = useState(null);

  const handleDeleteConfirm = async () => {
    if (deleteCategoryItem) {
      try {
        await deleteCategory(deleteCategoryItem._id);
        toast.success('Catégorie supprimée');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
      }
      setDeleteCategoryItem(null);
    }
  };

  const handleAddRoot = () => {
    setEditingCategory(null);
    setAddingToParentId(null);
    setIsFormOpen(true);
  };

  const handleAddSub = (parentId) => {
    setEditingCategory(null);
    setAddingToParentId(parentId);
    setIsFormOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setAddingToParentId(null);
    setIsFormOpen(true);
  };

  const actions = (
    <button 
      onClick={handleAddRoot}
      className="p-1.5 bg-copper-dim hover:bg-copper/20 rounded-full text-copper transition-colors"
      title="Ajouter une catégorie"
    >
      <Plus size={16} />
    </button>
  );

  return (
    <>
      <HeaderTitle>Catégories</HeaderTitle>
      <HeaderBackButton to="/" />
      <HeaderActions>{actions}</HeaderActions>
      {/* Tabs */}
      <div className="flex bg-surface p-1 rounded-2xl border border-border/40 gap-1 mb-6 select-none">
        {[
          { key: 'expense', label: 'Dépenses' },
          { key: 'income', label: 'Revenus' }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all active-spring-sm ${
              activeTab === tab.key
                ? 'bg-copper text-white shadow-sm font-extrabold'
                : 'text-secondary hover:text-primary hover:bg-border/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category List */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-[72px] bg-surface-2 rounded-2xl animate-pulse" />
          <div className="h-[72px] bg-surface-2 rounded-2xl animate-pulse" />
          <div className="h-[72px] bg-surface-2 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <CategoryList 
          categories={activeTab === 'expense' ? categoriesTree.expense : categoriesTree.income} 
          onEdit={handleEdit}
          onDelete={(cat) => setDeleteCategoryItem(cat)}
          onAddSub={handleAddSub}
        />
      )}

      <CategoryFormSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingCategory}
        initialType={activeTab}
        initialParentId={addingToParentId}
        onSave={async (data) => {
          if (editingCategory) {
            await updateCategory(editingCategory._id, data);
          } else {
            await addCategory(data);
          }
          setIsFormOpen(false);
        }}
        onDelete={async (id) => {
          await deleteCategory(id);
          setIsFormOpen(false);
        }}
      />

      <ConfirmModal
        isOpen={!!deleteCategoryItem}
        onClose={() => setDeleteCategoryItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la catégorie"
        confirmText="Supprimer"
        type="danger"
      >
        <div className="text-xs text-secondary leading-relaxed space-y-2">
          <p>
            Êtes-vous sûr de vouloir supprimer la catégorie <strong>"{deleteCategoryItem?.name}"</strong> ?
          </p>
          <p className="font-semibold text-danger">
            Attention : Cela pourrait affecter le classement de toutes les transactions liées à cette catégorie.
          </p>
        </div>
      </ConfirmModal>
    </>
  );
};

export default Categories;
