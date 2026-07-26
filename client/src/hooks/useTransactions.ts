import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Transaction } from '../types/financial';

interface TransactionFilters {
  [key: string]: any;
}

export const useTransactions = (filters: TransactionFilters = {}) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Transaction[], Error>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '1000', ...Object.fromEntries(
        Object.entries(filters).map(([k, v]) => [k, String(v)])
      ) });
      const res = await api.get<any>(`/transactions?${params.toString()}`);
      return res.data.transactions;
    },
  });

  const transactions = data || [];

  const addMutation = useMutation({
    mutationFn: async (newData: Partial<Transaction>) => {
      const res = await api.post<Transaction>('/transactions', newData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
      const res = await api.put<Transaction>(`/transactions/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  return {
    transactions,
    loading: isLoading,
    error: error ? (error.response?.data?.message || 'Error fetching transactions') : null,
    fetchTransactions: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    addTransaction: addMutation.mutateAsync,
    updateTransaction: (id: string, data: Partial<Transaction>) => updateMutation.mutateAsync({ id, data }),
    deleteTransaction: deleteMutation.mutateAsync
  };
};
