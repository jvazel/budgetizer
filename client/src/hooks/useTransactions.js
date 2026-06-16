import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useTransactions = (filters = {}) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 1000, ...filters });
      const res = await api.get(`/transactions?${params.toString()}`);
      return res.data.transactions;
    },
  });

  const transactions = data || [];

  const addMutation = useMutation({
    mutationFn: async (newData) => {
      const res = await api.post('/transactions', newData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/transactions/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    },
  });

  return {
    transactions,
    loading: isLoading,
    error: error ? (error.response?.data?.message || 'Error fetching transactions') : null,
    fetchTransactions: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    addTransaction: addMutation.mutateAsync,
    updateTransaction: (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteTransaction: deleteMutation.mutateAsync
  };
};

