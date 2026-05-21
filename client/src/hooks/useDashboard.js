import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/summary');
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const handleRefresh = () => fetchDashboard();
    window.addEventListener('transaction-changed', handleRefresh);
    return () => {
      window.removeEventListener('transaction-changed', handleRefresh);
    };
  }, [fetchDashboard]);

  return {
    data,
    loading,
    error,
    refreshDashboard: fetchDashboard
  };
};
