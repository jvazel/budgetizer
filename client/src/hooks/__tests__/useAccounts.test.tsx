import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccounts } from '../useAccounts';
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
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useAccounts hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch accounts on mount by default (fetchOnMount = true)', async () => {
    const mockAccounts = [{ _id: 'acc1', name: 'Checking', balance: 100, includeInTotal: true }];
    api.get.mockResolvedValue({ data: mockAccounts });

    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.get).toHaveBeenCalledWith('/accounts');
    expect(result.current.accounts).toEqual(mockAccounts);
    expect(result.current.totalBalance).toBe(100);
  });

  it('should NOT fetch accounts on mount if fetchOnMount is false', async () => {
    const { result } = renderHook(() => useAccounts(false), { wrapper });
    
    // Give it a tiny moment to ensure useEffect would have run if it was going to
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.accounts).toEqual([]);
  });

  it('should allow fetching accounts manually', async () => {
    const mockAccounts = [{ _id: 'acc1', name: 'Checking', balance: 100, includeInTotal: true }];
    api.get.mockResolvedValue({ data: mockAccounts });

    const { result } = renderHook(() => useAccounts(false), { wrapper });
    expect(api.get).not.toHaveBeenCalled();

    act(() => {
      result.current.fetchAccounts();
    });

    await waitFor(() => {
      expect(result.current.accounts).toEqual(mockAccounts);
    });

    expect(api.get).toHaveBeenCalledWith('/accounts');
  });

  it('should add account, update account, and delete account successfully', async () => {
    const mockAccounts = [{ _id: 'acc1', name: 'Checking', balance: 100, includeInTotal: true }];
    api.get.mockResolvedValue({ data: mockAccounts });

    const { result } = renderHook(() => useAccounts(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test addAccount
    const newAccount = { _id: 'acc2', name: 'Savings', balance: 500, includeInTotal: true };
    api.post.mockResolvedValue({ data: newAccount });
    api.get.mockResolvedValue({ data: [...mockAccounts, newAccount] });

    let added;
    await act(async () => {
      added = await result.current.addAccount({ name: 'Savings', balance: 500, includeInTotal: true });
    });
    expect(added).toEqual(newAccount);

    expect(api.post).toHaveBeenCalledWith('/accounts', { name: 'Savings', balance: 500, includeInTotal: true });
    
    await waitFor(() => {
      expect(result.current.accounts).toContainEqual(newAccount);
    });
    expect(result.current.totalBalance).toBe(600); // 100 + 500

    // Test updateAccount
    const updatedAccount = { _id: 'acc2', name: 'Super Savings', balance: 550, includeInTotal: true };
    api.put.mockResolvedValue({ data: updatedAccount });
    api.get.mockResolvedValue({ data: [mockAccounts[0], updatedAccount] });

    let updated;
    await act(async () => {
      updated = await result.current.updateAccount('acc2', { name: 'Super Savings', balance: 550 });
    });
    expect(updated).toEqual(updatedAccount);

    expect(api.put).toHaveBeenCalledWith('/accounts/acc2', { name: 'Super Savings', balance: 550 });
    await waitFor(() => {
      expect(result.current.accounts.find(a => a._id === 'acc2')).toEqual(updatedAccount);
    });

    // Test deleteAccount
    api.delete.mockResolvedValue({});
    api.get.mockResolvedValue({ data: [mockAccounts[0]] });

    await act(async () => {
      await result.current.deleteAccount('acc2');
    });

    expect(api.delete).toHaveBeenCalledWith('/accounts/acc2');
    await waitFor(() => {
      expect(result.current.accounts.find(a => a._id === 'acc2')).toBeUndefined();
    });
  });
});

