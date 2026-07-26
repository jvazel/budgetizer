/**
 * Interface for a Budget
 */
export interface Budget {
  _id: string;
  name: string;
  amount: number;
  month: string;
  year: number;
  categoryId?: string;
  type?: 'expense' | 'income';
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Budget } from '../types/financial';

interface BudgetParams {
  weekStart?: string;
  month?: string;
  year?: number;
}

export const useBudgets = (params: BudgetParams | string) => {
  let weekStart: string | undefined;
  let month: string | undefined;
  let year: number | undefined;

  if (typeof params === 'string') {
    month = params;
  } else if (params && typeof params === 'object') {
    weekStart = params.weekStart;
    month = params.month;
    year = params.year;
  }

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Budget[], Error>({
    queryKey: ['budgets', { weekStart, month, year }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (weekStart) queryParams.append('weekStart', weekStart);
      if (month) queryParams.append('month', month);
      if (year) queryParams.append('year', String(year));

      const queryString = queryParams.toString();
      const res = await api.get<Budget[]>(`/budgets${queryString ? `?${queryString}` : ''}`);
      return res.data;
    },
  });

  const budgets = data || [];

  const addMutation = useMutation({
    mutationFn: async (newData: Partial<Budget>) => {
      const res = await api.post<Budget>('/budgets', newData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Budget> }) => {
      const res = await api.put<Budget>(`/budgets/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return {
    budgets,
    loading: isLoading,
    error: error ? (error.response?.data?.message || 'Error fetching budgets') : null,
    fetchBudgets: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    addBudget: addMutation.mutateAsync,
    updateBudget: (id: string, data: Partial<Budget>) => updateMutation.mutateAsync({ id, data }),
    deleteBudget: deleteMutation.mutateAsync
  };
};
