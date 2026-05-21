import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useBudgets = (params) => {
  let weekStart, month, year;
  if (typeof params === 'string') {
    month = params;
  } else if (params && typeof params === 'object') {
    weekStart = params.weekStart;
    month = params.month;
    year = params.year;
  }

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (weekStart) queryParams.append('weekStart', weekStart);
      if (month) queryParams.append('month', month);
      if (year) queryParams.append('year', year);

      const queryString = queryParams.toString();
      const res = await api.get(`/budgets${queryString ? `?${queryString}` : ''}`);
      setBudgets(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching budgets');
    } finally {
      setLoading(false);
    }
  }, [weekStart, month, year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBudgets();

    const handleRefresh = () => fetchBudgets();
    window.addEventListener('transaction-changed', handleRefresh);
    return () => {
      window.removeEventListener('transaction-changed', handleRefresh);
    };
  }, [fetchBudgets]);

  const addBudget = async (data) => {
    const res = await api.post('/budgets', data);
    setBudgets([...budgets, res.data]);
    return res.data;
  };

  const updateBudget = async (id, data) => {
    const res = await api.put(`/budgets/${id}`, data);
    // Because spent/remaining are calculated on the backend during the GET,
    // an update might not return the fully enriched object if we just return the saved document.
    // So we trigger a re-fetch to ensure data consistency.
    await fetchBudgets();
    return res.data;
  };

  const deleteBudget = async (id) => {
    await api.delete(`/budgets/${id}`);
    setBudgets(budgets.filter(b => b._id !== id));
  };

  return {
    budgets,
    loading,
    error,
    fetchBudgets,
    addBudget,
    updateBudget,
    deleteBudget
  };
};
