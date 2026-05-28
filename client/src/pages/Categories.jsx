import React, { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import CategoryList from '../components/categories/CategoryList';
import CategoryFormSheet from '../components/categories/CategoryFormSheet';
import { useCategories } from '../hooks/useCategories';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const Categories = () => {
  const { categoriesTree, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState('expense');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [addingToParentId, setAddingToParentId] = useState(null);

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
      className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-accent transition-colors"
      title="Ajouter une catégorie"
    >
      <Plus size={16} />
    </button>
  );

  return (
    <AppShell title="Catégories" backTo="/" actions={actions}>
      {/* Tabs */}
      <div className="flex bg-surface-2 p-1 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'expense' ? 'bg-danger text-white shadow-sm' : 'text-muted hover:text-primary'
          }`}
        >
          Dépenses
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'income' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary'
          }`}
        >
          Revenus
        </button>
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
          onDelete={async (cat) => {
            if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${cat.name}" ?`)) {
              try {
                await deleteCategory(cat._id);
                toast.success('Catégorie supprimée');
              } catch (err) {
                toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
              }
            }
          }}
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
    </AppShell>
  );
};

export default Categories;
