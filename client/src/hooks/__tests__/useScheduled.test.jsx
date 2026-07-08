import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScheduled } from '../useScheduled';
import api from '../../services/api';
import toast from 'react-hot-toast';
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

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() }
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

describe('useScheduled hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch all scheduled, pending and upcoming on mount', async () => {
    const mockScheduled = [{ _id: 's1', description: 'Rent' }];
    const mockPending = [];
    const mockUpcoming = [{ _id: 's1', nextDate: new Date() }];

    api.get.mockResolvedValueOnce({ data: mockScheduled });
    api.get.mockResolvedValueOnce({ data: mockPending });
    api.get.mockResolvedValueOnce({ data: mockUpcoming });

    const { result } = renderHook(() => useScheduled(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/scheduled');
    expect(api.get).toHaveBeenCalledWith('/scheduled/pending');
    expect(api.get).toHaveBeenCalledWith('/scheduled/upcoming?days=30');
    expect(result.current.scheduled).toEqual(mockScheduled);
    expect(result.current.pending).toEqual(mockPending);
    expect(result.current.upcoming).toEqual(mockUpcoming);
  });

  it('should add a scheduled transaction', async () => {
    const mockSched = { _id: 's1', description: 'Rent', amount: 600 };
    api.post.mockResolvedValueOnce({ data: [] }); // all
    api.post.mockResolvedValueOnce({ data: [] }); // pending
    api.post.mockResolvedValueOnce({ data: [] }); // upcoming
    api.post.mockImplementation((url) => {
      if (url === '/scheduled') return Promise.resolve({ data: mockSched });
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addScheduled({ description: 'Rent', amount: 600, frequency: { every: 1, unit: 'month' } });
    });

    expect(api.post).toHaveBeenCalledWith('/scheduled', { description: 'Rent', amount: 600, frequency: { every: 1, unit: 'month' } });
    expect(toast.success).toHaveBeenCalled();
  });

  it('should update a scheduled transaction by id', async () => {
    const mockSched = [{ _id: 's1' }];
    api.get.mockResolvedValueOnce({ data: mockSched });
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [] });
    api.put.mockResolvedValueOnce({ data: { _id: 's1', description: 'Updated Rent' } });

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateScheduled('s1', { description: 'Updated Rent' });
    });

    expect(api.put).toHaveBeenCalledWith('/scheduled/s1', { description: 'Updated Rent' });
  });

  it('should delete a scheduled transaction by id', async () => {
    const mockSched = [{ _id: 's1' }];
    api.get.mockResolvedValueOnce({ data: mockSched });
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [] });
    api.delete.mockResolvedValueOnce({});

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteScheduled('s1');
    });

    expect(api.delete).toHaveBeenCalledWith('/scheduled/s1');
  });

  it('should confirm a pending scheduled transaction', async () => {
    const mockSched = [];
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [{ _id: 's1' }] });
    api.get.mockResolvedValueOnce({ data: [] });
    api.post.mockImplementation((url) => {
      if (url === '/scheduled/s1/confirm') return Promise.resolve({ data: {} });
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.confirmPending('s1', 500);
    });

    expect(api.post).toHaveBeenCalledWith('/scheduled/s1/confirm', { amount: 500 });
    expect(toast.success).toHaveBeenCalled();
  });

  it('should skip a pending scheduled transaction', async () => {
    const mockSched = [];
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [{ _id: 's1' }] });
    api.get.mockResolvedValueOnce({ data: [] });
    api.post.mockImplementation((url) => {
      if (url === '/scheduled/s1/skip') return Promise.resolve({ data: {} });
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.skipPending('s1');
    });

    expect(api.post).toHaveBeenCalledWith('/scheduled/s1/skip');
  });

  it('should show error toast on add failure', async () => {
    const mockSched = [];
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [] });
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Server error' } } });

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      try {
        await result.current.addScheduled({ description: 'Rent', amount: 600 });
      } catch (e) { /* expected */ }
    });

    expect(toast.error).toHaveBeenCalledWith('Server error');
  });

  it('should return error message on fetch failure', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: 'Fetch failed' } } });
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });

  it('should invalidate all related queries on refresh', async () => {
    const mockSched = [];
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [] });
    api.get.mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useScheduled(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    await act(async () => {
      await result.current.refreshScheduled();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scheduled'] });
    invalidateSpy.mockRestore();
  });
});
