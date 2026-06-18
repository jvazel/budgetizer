import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useScheduled = () => {
  const queryClient = useQueryClient();

  const { data: scheduledData, isLoading: isAllLoading, error: allError } = useQuery({
    queryKey: ['scheduled', 'all'],
    queryFn: async () => {
      const res = await api.get('/scheduled');
      return res.data;
    }
  });

  const { data: pendingData, isLoading: isPendingLoading, error: pendingError } = useQuery({
    queryKey: ['scheduled', 'pending'],
    queryFn: async () => {
      const res = await api.get('/scheduled/pending');
      return res.data;
    }
  });

  const { data: upcomingData, isLoading: isUpcomingLoading, error: upcomingError } = useQuery({
    queryKey: ['scheduled', 'upcoming'],
    queryFn: async () => {
      const res = await api.get('/scheduled/upcoming?days=30');
      return res.data;
    }
  });

  const scheduled = scheduledData || [];
  const pending = pendingData || [];
  const upcoming = upcomingData || [];
  const loading = isAllLoading || isPendingLoading || isUpcomingLoading;
  const error = allError || pendingError || upcomingError;

  const invalidateScheduledQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduled'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const addMutation = useMutation({
    mutationFn: async (newData) => {
      const res = await api.post('/scheduled', newData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Planification créée');
      invalidateScheduledQueries();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/scheduled/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Planification modifiée');
      invalidateScheduledQueries();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/scheduled/${id}`);
    },
    onSuccess: () => {
      toast.success('Planification supprimée');
      invalidateScheduledQueries();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors du saut');
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ id, customAmount }) => {
      const res = await api.post(`/scheduled/${id}/confirm`, { amount: customAmount });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Transaction confirmée et enregistrée !');
      invalidateScheduledQueries();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur de confirmation');
    }
  });

  const skipMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/scheduled/${id}/skip`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Échéance ignorée');
      invalidateScheduledQueries();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors du saut');
    }
  });

  return {
    scheduled,
    pending,
    upcoming,
    loading,
    error: error ? (error.response?.data?.message || 'Erreur lors de la récupération des données planifiées') : null,
    refreshScheduled: () => queryClient.invalidateQueries({ queryKey: ['scheduled'] }),
    addScheduled: addMutation.mutateAsync,
    updateScheduled: (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteScheduled: deleteMutation.mutateAsync,
    confirmPending: (id, customAmount) => confirmMutation.mutateAsync({ id, customAmount }),
    skipPending: skipMutation.mutateAsync
  };
};
