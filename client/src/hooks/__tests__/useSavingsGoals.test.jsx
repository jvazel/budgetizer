import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSavingsGoals } from '../useSavingsGoals';
import api from '../../services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useSavingsGoals hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch savings goals on mount', async () => {
    const mockGoals = [
      { _id: 'sg1', name: 'Emergency Fund', targetAmount: 5000, currentAmount: 1200 }
    ];
    api.get.mockResolvedValue({ data: mockGoals });

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/savings-goals');
    expect(result.current.savingsGoals).toEqual(mockGoals);
  });

  it('should add a savings goal and invalidate related queries', async () => {
    const mockGoal = { _id: 'sg1', name: 'Vacation', targetAmount: 2000, currentAmount: 0 };
    api.post.mockResolvedValue({ data: mockGoal });

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addSavingsGoal({ name: 'Vacation', targetAmount: 2000 });
    });

    expect(api.post).toHaveBeenCalledWith('/savings-goals', { name: 'Vacation', targetAmount: 2000 });
  });

  it('should update a savings goal by id', async () => {
    const mockGoal = { _id: 'sg1', name: 'Updated Goal', targetAmount: 3000, currentAmount: 500 };
    api.put.mockResolvedValue({ data: mockGoal });

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSavingsGoal('sg1', { name: 'Updated Goal', targetAmount: 3000, currentAmount: 500 });
    });

    expect(api.put).toHaveBeenCalledWith('/savings-goals/sg1', { name: 'Updated Goal', targetAmount: 3000, currentAmount: 500 });
  });

  it('should delete a savings goal by id', async () => {
    api.delete.mockResolvedValue({});

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteSavingsGoal('sg1');
    });

    expect(api.delete).toHaveBeenCalledWith('/savings-goals/sg1');
  });

  it('should return error message on fetch failure', async () => {
    api.get.mockRejectedValue({ response: { data: { message: 'API Error' } } });

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('API Error');
  });

  it('should return default error when response data is missing', async () => {
    api.get.mockRejectedValue(new Error('Network'));

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Erreur de chargement des objectifs d'épargne");
  });

  it('should return empty array when API returns no data', async () => {
    api.get.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.savingsGoals).toEqual([]);
  });

  it('should invalidate queries on refresh', async () => {
    const mockGoals = [];
    api.get.mockResolvedValue({ data: mockGoals });

    const { result } = renderHook(() => useSavingsGoals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    await act(async () => {
      await result.current.fetchSavingsGoals();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['savings-goals'] });
    invalidateSpy.mockRestore();
  });
});
