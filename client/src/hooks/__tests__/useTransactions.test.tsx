import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTransactions } from '../useTransactions';
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

describe('useTransactions hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch transactions on mount', async () => {
    const mockTransactions = [
      { _id: 'tx1', description: 'Test', amount: 50, type: 'expense' }
    ];
    api.get.mockResolvedValue({ data: { transactions: mockTransactions } });

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/transactions?limit=1000');
    expect(result.current.transactions).toEqual(mockTransactions);
  });

  it('should pass filters to the API query', async () => {
    const mockTransactions = [];
    api.get.mockResolvedValue({ data: { transactions: mockTransactions } });

    renderHook(() => useTransactions({ type: 'income', limit: 50 }), { wrapper });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/transactions?limit=50&type=income');
  });

  it('should add a transaction and invalidate related queries', async () => {
    const mockTx = { _id: 'tx1', description: 'New tx', amount: 100 };
    api.post.mockResolvedValue({ data: mockTx });

    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTransaction({ description: 'New tx', amount: 100, type: 'expense' });
    });

    expect(api.post).toHaveBeenCalledWith('/transactions', { description: 'New tx', amount: 100, type: 'expense' });
  });

  it('should update a transaction by id', async () => {
    const mockTx = { _id: 'tx1', description: 'Updated', amount: 200 };
    api.put.mockResolvedValue({ data: mockTx });

    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateTransaction('tx1', { description: 'Updated', amount: 200 });
    });

    expect(api.put).toHaveBeenCalledWith('/transactions/tx1', { description: 'Updated', amount: 200 });
  });

  it('should delete a transaction by id', async () => {
    api.delete.mockResolvedValue({});

    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteTransaction('tx1');
    });

    expect(api.delete).toHaveBeenCalledWith('/transactions/tx1');
  });

  it('should return error message on fetch failure', async () => {
    api.get.mockRejectedValue({ response: { data: { message: 'API Error' } } });

    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('API Error');
  });

  it('should invalidate queries on refresh', async () => {
    const mockTx = [];
    api.get.mockResolvedValue({ data: { transactions: mockTx } });

    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    await act(async () => {
      await result.current.fetchTransactions();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    invalidateSpy.mockRestore();
  });

  it('should use default error message when response data is missing', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTransactions(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Error fetching transactions');
  });
});
