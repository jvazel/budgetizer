import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Account } from '../types/financial';

interface UpdateAccountParams {
  id: string;
  accountData: Partial<Account>;
}

export const useAccounts = (fetchOnMount = true) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get<Account[]>('/accounts');
      return res.data;
    },
    enabled: fetchOnMount,
  });

  const accounts = data || [];

  const totalBalance = accounts
    .filter(acc => acc.includeInTotal) // Note: includeInTotal might not be in the interface yet, I should check
    .reduce((acc, curr) => acc + curr.balance, 0);

  const addMutation = useMutation({
    mutationFn: async (accountData: Partial<Account>) => {
      const res = await api.post<Account>('/accounts', accountData);
      return res.data;
    },
    onSuccess: (newAcc) => {
      queryClient.setQueryData(['accounts'], (old: Account[] | undefined) => [...(old || []), newAcc]);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, accountData }: UpdateAccountParams) => {
      const res = await api.put<Account>(`/accounts/${id}`, accountData);
      return res.data;
    },
    onSuccess: (updatedAcc, variables) => {
      queryClient.setQueryData(['accounts'], (old: Account[] | undefined) => 
        old?.map(acc => acc._id === variables.id ? updatedAcc : acc) || []
      );
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounts/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['accounts'], (old: Account[] | undefined) => 
        old?.filter(acc => acc._id !== id) || []
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
    updateAccount: (id: string, accountData: Partial<Account>) => updateMutation.mutateAsync({ id, accountData }),
    deleteAccount: deleteMutation.mutateAsync
  };
};
