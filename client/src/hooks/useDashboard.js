import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useDashboard = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error ? (error.response?.data?.message || 'Error fetching dashboard data') : null,
    refreshDashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  };
};

