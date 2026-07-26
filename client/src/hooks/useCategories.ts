import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
export type { Category, CategoriesTree } from './types';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<Category[]>('/categories');
      setCategories(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Hierarchical structuring
  const categoriesTree = useMemo((): CategoriesTree => {
    const expenses = categories.filter(c => c.type === 'expense' || c.type === 'both');
    const incomes = categories.filter(c => c.type === 'income' || c.type === 'both');

    const buildTree = (cats: Category[]): Category[] => {
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

  const addCategory = async (categoryData: Partial<Category>) => {
    const res = await api.post<Category>('/categories', categoryData);
    setCategories([...categories, res.data]);
    return res.data;
  };

  const updateCategory = async (id: string, categoryData: Partial<Category>) => {
    const res = await api.put<Category>(`/categories/${id}`, categoryData);
    setCategories(categories.map(cat => cat._id === id ? res.data : cat));
    return res.data;
  };

  const deleteCategory = async (id: string) => {
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
