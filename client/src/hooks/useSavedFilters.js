import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSavedFilters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/saved-filters');
      setSavedFilters(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la récupération des filtres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedFilters();
  }, [fetchSavedFilters]);

  const addSavedFilter = async (name, filters) => {
    const res = await api.post('/saved-filters', { name, filters });
    setSavedFilters(prev => [res.data, ...prev]);
    return res.data;
  };

  const updateSavedFilter = async (id, name, filters) => {
    const res = await api.put(`/saved-filters/${id}`, { name, filters });
    setSavedFilters(prev => prev.map(f => f._id === id ? res.data : f));
    return res.data;
  };

  const deleteSavedFilter = async (id) => {
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
