import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboard } from '../useDashboard';
import api from '../../services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
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

describe('useDashboard hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch dashboard summary on mount', async () => {
    const mockData = { totalBalance: 5000, monthlyIncome: 3000, monthlyExpenses: 1800 };
    api.get.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/dashboard/summary');
    expect(result.current.data).toEqual(mockData);
  });

  it('should return null data when API returns no data', async () => {
    api.get.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
  });

  it('should return error message on fetch failure', async () => {
    api.get.mockRejectedValue({ response: { data: { message: 'API Error' } } });

    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('API Error');
  });

  it('should return default error when response data is missing', async () => {
    api.get.mockRejectedValue(new Error('Network'));

    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Error fetching dashboard data');
  });

  it('should invalidate queries on refresh', async () => {
    const mockData = {};
    api.get.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    await act(async () => {
      await result.current.refreshDashboard();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    invalidateSpy.mockRestore();
  });

  it('should be loading while fetching', async () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDashboard(), { wrapper });

    expect(result.current.loading).toBe(true);
  });
});
