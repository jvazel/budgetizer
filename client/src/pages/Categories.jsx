import React, { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import CategoryList from '../components/categories/CategoryList';
import CategoryFormSheet from '../components/categories/CategoryFormSheet';
import { useCategories } from '../hooks/useCategories';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Categories = () => {
  const navigate = useNavigate();
  const { categoriesTree, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState('expense');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [addingToParentId, setAddingToParentId] = useState(null);

  const header = (
    <div className="w-full flex items-center gap-4">
      <button onClick={() => navigate(-1)} className="text-muted hover:text-primary transition-colors p-2 -ml-2">
        <ArrowLeft size={24} />
      </button>
      <h1 className="text-lg font-bold text-primary">Catégories</h1>
    </div>
  );

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

  return (
    <AppShell header={header}>
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
            await deleteCategory(cat._id);
          }}
          onAddSub={handleAddSub}
        />
      )}

      {/* Floating Action Button for Root Category */}
      <button 
        onClick={handleAddRoot}
        className="fixed bottom-[88px] right-6 w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Plus size={28} />
      </button>

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
