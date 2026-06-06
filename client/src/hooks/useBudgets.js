import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['budgets', { weekStart, month, year }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (weekStart) queryParams.append('weekStart', weekStart);
      if (month) queryParams.append('month', month);
      if (year) queryParams.append('year', year);

      const queryString = queryParams.toString();
      const res = await api.get(`/budgets${queryString ? `?${queryString}` : ''}`);
      return res.data;
    },
  });

  const budgets = data || [];

  const addMutation = useMutation({
    mutationFn: async (newData) => {
      const res = await api.post('/budgets', newData);
      return res.data;
    },
    onSuccess: () => {
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/budgets/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    },
  });

  return {
    budgets,
    loading: isLoading,
    error: error ? (error.response?.data?.message || 'Error fetching budgets') : null,
    fetchBudgets: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    addBudget: addMutation.mutateAsync,
    updateBudget: (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteBudget: deleteMutation.mutateAsync
  };
};

