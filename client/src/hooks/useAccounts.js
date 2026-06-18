import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useAccounts = (fetchOnMount = true) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data;
    },
    enabled: fetchOnMount,
  });

  const accounts = data || [];

  const totalBalance = accounts
    .filter(acc => acc.includeInTotal)
    .reduce((acc, curr) => acc + curr.balance, 0);

  const addMutation = useMutation({
    mutationFn: async (accountData) => {
      const res = await api.post('/accounts', accountData);
      return res.data;
    },
    onSuccess: (newAcc) => {
      queryClient.setQueryData(['accounts'], (old = []) => [...old, newAcc]);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, accountData }) => {
      const res = await api.put(`/accounts/${id}`, accountData);
      return res.data;
    },
    onSuccess: (updatedAcc, variables) => {
      queryClient.setQueryData(['accounts'], (old = []) => 
        old.map(acc => acc._id === variables.id ? updatedAcc : acc)
      );
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/accounts/${id}`);
    },
    onSuccess: (data, id) => {
      queryClient.setQueryData(['accounts'], (old = []) => 
        old.filter(acc => acc._id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return {
    accounts,
    totalBalance,
    loading: fetchOnMount ? isLoading : false,
    error: error ? (error.response?.data?.message || 'Error fetching accounts') : null,
    fetchAccounts: refetch,
    addAccount: addMutation.mutateAsync,
    updateAccount: (id, accountData) => updateMutation.mutateAsync({ id, accountData }),
    deleteAccount: deleteMutation.mutateAsync
  };
};
