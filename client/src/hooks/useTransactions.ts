import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Transaction } from '../types/financial';
import { queryKeys } from '../services/queryKeys';

interface TransactionFilters {
  [key: string]: any;
}

export const useTransactions = (filters: TransactionFilters = {}) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Transaction[], Error>({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '1000', ...Object.fromEntries(
        Object.entries(filters).map(([k, v]) => [k, String(v)])
      ) });
      const res = await api.get<any>(`/transactions?${params.toString()}`);
      return res.data.transactions;
    },
  });

  const transactions = data || [];

  const invalidateRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
  };

  const addMutation = useMutation({
    mutationFn: async (newData: Partial<Transaction>) => {
      const res = await api.post<Transaction>('/transactions', newData);
      return res.data;
    },
    onSuccess: () => {
      invalidateRelatedQueries();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
      const res = await api.put<Transaction>(`/transactions/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      invalidateRelatedQueries();
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

  const reviewMutation = useMutation({
    mutationFn: async ({ id, isReviewed }: { id: string; isReviewed?: boolean }) => {
      const res = await api.patch<{ message: string; isReviewed: boolean }>(`/transactions/${id}/review`, { isReviewed });
      return res.data;
    },
    onSuccess: () => {
      invalidateRelatedQueries();
    },
  });

  return {
    transactions,
    loading: isLoading,
    error: error ? (error.response?.data?.message || 'Error fetching transactions') : null,
    fetchTransactions: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    addTransaction: addMutation.mutateAsync,
    updateTransaction: (id: string, data: Partial<Transaction>) => updateMutation.mutateAsync({ id, data }),
    deleteTransaction: deleteMutation.mutateAsync,
    reviewTransaction: (id: string, isReviewed?: boolean) => reviewMutation.mutateAsync({ id, isReviewed })
  };
};
