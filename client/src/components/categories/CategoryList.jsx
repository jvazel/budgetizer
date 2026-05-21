import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Edit2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryItem = ({ category, isChild, onEdit, onDelete, onAddSub }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="mb-2">
      <div 
        className={`flex items-center justify-between p-4 bg-surface-2 rounded-2xl ${isChild ? 'ml-6 border-l-2' : ''}`}
        style={{ borderLeftColor: isChild ? category.color : 'transparent' }}
      >
        <div className="flex items-center gap-3 flex-1" onClick={() => hasChildren && setIsOpen(!isOpen)}>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
            style={{ backgroundColor: `${category.color}20` }} // 20 hex is 12% opacity
          >
            {category.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-primary font-medium">{category.name}</h3>
            {hasChildren && <p className="text-xs text-muted">{category.children.length} sous-catégories</p>}
          </div>
          {hasChildren && (
            <button className="text-muted p-2">
              {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-2">
          {!isChild && !category.isDefault && (
            <button onClick={() => onAddSub(category._id)} className="text-accent hover:bg-surface p-2 rounded-xl transition-colors">
              <Plus size={18} />
            </button>
          )}
          <button onClick={() => onEdit(category)} className="text-info hover:bg-surface p-2 rounded-xl transition-colors">
            <Edit2 size={18} />
          </button>
          {!category.isDefault && (
             <button onClick={() => onDelete(category)} className="text-danger hover:bg-surface p-2 rounded-xl transition-colors">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2"
          >
            {category.children.map(child => (
              <CategoryItem 
                key={child._id} 
                category={child} 
                isChild={true}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CategoryList = ({ categories, onEdit, onDelete, onAddSub }) => {
  if (!categories || categories.length === 0) {
    return <div className="text-center text-muted p-8">Aucune catégorie.</div>;
  }

  return (
    <div className="pb-24">
      {categories.map(category => (
        <CategoryItem 
          key={category._id} 
          category={category} 
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSub={onAddSub}
        />
      ))}
    </div>
  );
};

export default CategoryList;
