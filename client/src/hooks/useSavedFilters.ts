import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface SavedFilter {
  _id: string;
  name: string;
  filters: any;
}

export const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedFilters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<SavedFilter[]>('/saved-filters');
      setSavedFilters(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la récupération des filtres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedFilters();
  }, [fetchSavedFilters]);

  const addSavedFilter = async (name: string, filters: any) => {
    const res = await api.post<SavedFilter>('/saved-filters', { name, filters });
    setSavedFilters(prev => [res.data, ...prev]);
    return res.data;
  };

  const updateSavedFilter = async (id: string, name: string, filters: any) => {
    const res = await api.put<SavedFilter>(`/saved-filters/${id}`, { name, filters });
    setSavedFilters(prev => prev.map(f => f._id === id ? res.data : f));
    return res.data;
  };

  const deleteSavedFilter = async (id: string) => {
    await api.delete(`/saved-filters/${id}`);
    setSavedFilters(prev => prev.filter(f => f._id !== id));
  };

  return {
    savedFilters,
    loading,
    error,
    fetchSavedFilters,
    addSavedFilter,
    updateSavedFilter,
    deleteSavedFilter
  };
};
