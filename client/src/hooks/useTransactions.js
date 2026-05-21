import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useTransactions = (filters = {}) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters);
      const res = await api.get(`/transactions?${params.toString()}`);
      setTransactions(res.data.transactions);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching transactions');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // Re-fetch when filters change

  useEffect(() => {
    fetchTransactions();

    const handleRefresh = () => fetchTransactions();
    window.addEventListener('transaction-changed', handleRefresh);
    return () => {
      window.removeEventListener('transaction-changed', handleRefresh);
    };
  }, [fetchTransactions]);

  const addTransaction = async (data) => {
    const res = await api.post('/transactions', data);
    setTransactions([res.data, ...transactions]);
    return res.data;
  };

  const updateTransaction = async (id, data) => {
    const res = await api.put(`/transactions/${id}`, data);
    setTransactions(transactions.map(t => t._id === id ? res.data : t));
    window.dispatchEvent(new CustomEvent('transaction-changed'));
    return res.data;
  };

  const deleteTransaction = async (id) => {
    await api.delete(`/transactions/${id}`);
    setTransactions(transactions.filter(t => t._id !== id));
    window.dispatchEvent(new CustomEvent('transaction-changed'));
  };

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction
  };
};
