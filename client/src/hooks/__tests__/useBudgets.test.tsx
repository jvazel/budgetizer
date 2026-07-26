import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBudgets } from '../useBudgets';
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

describe('useBudgets hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch budgets on mount with no params', async () => {
    const mockBudgets = [{ _id: 'b1', name: 'Food', amount: 300 }];
    api.get.mockResolvedValue({ data: mockBudgets });

    const { result } = renderHook(() => useBudgets(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/budgets');
    expect(result.current.budgets).toEqual(mockBudgets);
  });

  it('should pass month param as query string', async () => {
    const mockBudgets = [];
    api.get.mockResolvedValue({ data: mockBudgets });

    renderHook(() => useBudgets('2026-06'), { wrapper });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/budgets?month=2026-06');
  });

  it('should pass weekStart, month and year params as query string', async () => {
    const mockBudgets = [];
    api.get.mockResolvedValue({ data: mockBudgets });

    renderHook(() => useBudgets({ weekStart: '2026-06-01', month: '2026-06', year: 2026 }), { wrapper });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const callArg = api.get.mock.calls[0][0];
    expect(callArg).toContain('weekStart=2026-06-01');
    expect(callArg).toContain('month=2026-06');
    expect(callArg).toContain('year=2026');
  });

  it('should add a budget and invalidate related queries', async () => {
    const mockBudget = { _id: 'b1', name: 'Food', amount: 300 };
    api.post.mockResolvedValue({ data: mockBudget });

    const { result } = renderHook(() => useBudgets(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addBudget({ name: 'Food', amount: 300, categoryId: 'cat1' });
    });

    expect(api.post).toHaveBeenCalledWith('/budgets', { name: 'Food', amount: 300, categoryId: 'cat1' });
  });

  it('should update a budget by id', async () => {
    const mockBudget = { _id: 'b1', name: 'Updated Food', amount: 400 };
    api.put.mockResolvedValue({ data: mockBudget });

    const { result } = renderHook(() => useBudgets(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateBudget('b1', { name: 'Updated Food', amount: 400 });
    });

    expect(api.put).toHaveBeenCalledWith('/budgets/b1', { name: 'Updated Food', amount: 400 });
  });

  it('should delete a budget by id', async () => {
    api.delete.mockResolvedValue({});

    const { result } = renderHook(() => useBudgets(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteBudget('b1');
    });

    expect(api.delete).toHaveBeenCalledWith('/budgets/b1');
  });

  it('should return error message on fetch failure', async () => {
    api.get.mockRejectedValue({ response: { data: { message: 'API Error' } } });

    const { result } = renderHook(() => useBudgets(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('API Error');
  });

  it('should return empty array when API returns no data', async () => {
    api.get.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useBudgets(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.budgets).toEqual([]);
  });

  it('should invalidate queries on refresh', async () => {
    const mockBudgets = [];
    api.get.mockResolvedValue({ data: mockBudgets });

    const { result } = renderHook(() => useBudgets(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    await act(async () => {
      await result.current.fetchBudgets();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['budgets'] });
    invalidateSpy.mockRestore();
  });
});
