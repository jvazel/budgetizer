import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Hierarchical structuring
  const categoriesTree = useMemo(() => {
    const expenses = categories.filter(c => c.type === 'expense' || c.type === 'both');
    const incomes = categories.filter(c => c.type === 'income' || c.type === 'both');

    const buildTree = (cats) => {
      const rootNodes = cats.filter(c => !c.parentId);
      return rootNodes.map(root => ({
        ...root,
        children: cats.filter(c => c.parentId === root._id)
      }));
    };

    return {
      expense: buildTree(expenses),
      income: buildTree(incomes)
    };
  }, [categories]);

  const addCategory = async (categoryData) => {
    const res = await api.post('/categories', categoryData);
    setCategories([...categories, res.data]);
    return res.data;
  };

  const updateCategory = async (id, categoryData) => {
    const res = await api.put(`/categories/${id}`, categoryData);
    setCategories(categories.map(cat => cat._id === id ? res.data : cat));
    return res.data;
  };

  const deleteCategory = async (id) => {
    await api.delete(`/categories/${id}`);
    setCategories(categories.filter(cat => cat._id !== id));
  };

  return {
    categories,
    categoriesTree,
    loading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory
  };
};
