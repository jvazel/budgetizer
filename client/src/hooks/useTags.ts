import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useTags = (fetchOnMount = true) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data;
     },
    enabled: fetchOnMount,
   });

  const tags = data || [];

  const addMutation = useMutation({
    mutationFn: async (tagData: Record<string, unknown>) => {
      const res = await api.post('/tags', tagData);
      return res.data;
     },
    onSuccess: (newTag) => {
      queryClient.setQueryData(['tags'], (old: unknown[] = []) => [...old, newTag]);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
     },
   });

  const updateMutation = useMutation({
    mutationFn: async ({ id, tagData }: { id: string; tagData: Record<string, unknown> }) => {
      const res = await api.put(`/tags/${id}`, tagData);
      return res.data;
     },
    onSuccess: (updatedTag, variables) => {
      queryClient.setQueryData(['tags'], (old: unknown[] = []) =>
        old.map(tag => tag._id === variables.id ? updatedTag : tag)
       );
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
     },
   });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tags/${id}`);
     },
    onSuccess: (_data, id) => {
      queryClient.setQueryData(['tags'], (old: unknown[] = []) =>
        old.filter(tag => tag._id !== id)
       );
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
     },
   });

  return {
    tags,
    loading: fetchOnMount ? isLoading : false,
    error: error ? (error.response?.data?.message || 'Error fetching tags') : null,
    fetchTags: refetch,
    addTag: addMutation.mutateAsync,
    updateTag: (id: string, tagData: Record<string, unknown>) => updateMutation.mutateAsync({ id, tagData }),
    deleteTag: deleteMutation.mutateAsync
   };
};
