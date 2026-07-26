import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useShares = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shares'],
    queryFn: async () => {
      const res = await api.get('/shares');
      return res.data;
     }
   });

  const shares = data || { sent: [], received: [] };

  const createShareMutation = useMutation({
    mutationFn: async (shareData: Record<string, unknown>) => {
      const res = await api.post('/shares', shareData);
      return res.data;
     },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
     }
   });

  const updateShareMutation = useMutation({
    mutationFn: async ({ id, permission }: { id: string; permission: string }) => {
      const res = await api.put(`/shares/${id}`, { permission });
      return res.data;
     },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
     }
   });

  const deleteShareMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/shares/${id}`);
     },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
     }
   });

  return {
    shares,
    loading: isLoading,
    error: error ? (error.response?.data?.message || 'Erreur lors du traitement des partages') : null,
    createShare: createShareMutation.mutateAsync,
    updateShare: (id: string, permission: string) => updateShareMutation.mutateAsync({ id, permission }),
    deleteShare: deleteShareMutation.mutateAsync
   };
};
