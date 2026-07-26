import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useSavingsGoals = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: async () => {
      const res = await api.get('/savings-goals');
      return res.data;
      },
    });

  const savingsGoals = data || [];

  const addMutation = useMutation({
    mutationFn: async (newData: Record<string, unknown>) => {
      const res = await api.post('/savings-goals', newData);
      return res.data;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      },
    });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put(`/savings-goals/${id}`, data);
      return res.data;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      },
    });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/savings-goals/${id}`);
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      },
    });

  return {
    savingsGoals,
    loading: isLoading,
    error: error ? (error.response?.data?.message || "Erreur de chargement des objectifs d'épargne") : null,
    fetchSavingsGoals: () => queryClient.invalidateQueries({ queryKey: ['savings-goals'] }),
    addSavingsGoal: addMutation.mutateAsync,
    updateSavingsGoal: (id: string, data: Record<string, unknown>) => updateMutation.mutateAsync({ id, data }),
    deleteSavingsGoal: deleteMutation.mutateAsync
    };
};
