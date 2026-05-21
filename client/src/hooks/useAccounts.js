import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounts');
      setAccounts(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalBalance = accounts
    .filter(acc => acc.includeInTotal)
    .reduce((acc, curr) => acc + curr.balance, 0);

  const addAccount = async (accountData) => {
    const res = await api.post('/accounts', accountData);
    setAccounts([...accounts, res.data]);
    return res.data;
  };

  const updateAccount = async (id, accountData) => {
    const res = await api.put(`/accounts/${id}`, accountData);
    setAccounts(accounts.map(acc => acc._id === id ? res.data : acc));
    return res.data;
  };

  const deleteAccount = async (id) => {
    await api.delete(`/accounts/${id}`);
    setAccounts(accounts.filter(acc => acc._id !== id));
  };

  return {
    accounts,
    totalBalance,
    loading,
    error,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount
  };
};
