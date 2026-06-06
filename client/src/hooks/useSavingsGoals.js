import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useSavingsGoals = () => {
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const fetchSavingsGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/savings-goals');
      setSavingsGoals(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la récupération des objectifs d\'épargne');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavingsGoals();

    const handleRefresh = () => fetchSavingsGoals();
    window.addEventListener('transaction-changed', handleRefresh);
    return () => {
      window.removeEventListener('transaction-changed', handleRefresh);
    };
  }, [fetchSavingsGoals]);

  const addSavingsGoal = async (data) => {
    const res = await api.post('/savings-goals', data);
    setSavingsGoals([...savingsGoals, res.data]);
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    window.dispatchEvent(new CustomEvent('transaction-changed'));
    return res.data;
  };

  const updateSavingsGoal = async (id, data) => {
    const res = await api.put(`/savings-goals/${id}`, data);
    setSavingsGoals(savingsGoals.map(g => g._id === id ? res.data : g));
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    window.dispatchEvent(new CustomEvent('transaction-changed'));
    return res.data;
  };

  const deleteSavingsGoal = async (id) => {
    await api.delete(`/savings-goals/${id}`);
    setSavingsGoals(savingsGoals.filter(g => g._id !== id));
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    window.dispatchEvent(new CustomEvent('transaction-changed'));
  };

  return {
    savingsGoals,
    loading,
    error,
    fetchSavingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal
  };
};
