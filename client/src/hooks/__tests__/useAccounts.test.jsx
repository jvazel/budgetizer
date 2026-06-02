import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccounts } from '../useAccounts';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('useAccounts hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch accounts on mount by default (fetchOnMount = true)', async () => {
    const mockAccounts = [{ _id: 'acc1', name: 'Checking', balance: 100, includeInTotal: true }];
    api.get.mockResolvedValue({ data: mockAccounts });

    let hookResult;
    await act(async () => {
      const { result } = renderHook(() => useAccounts());
      hookResult = result;
    });

    expect(api.get).toHaveBeenCalledWith('/accounts');
    expect(hookResult.current.accounts).toEqual(mockAccounts);
    expect(hookResult.current.totalBalance).toBe(100);
    expect(hookResult.current.loading).toBe(false);
  });

  it('should NOT fetch accounts on mount if fetchOnMount is false', async () => {
    await act(async () => {
      renderHook(() => useAccounts(false));
    });

    expect(api.get).not.toHaveBeenCalled();
  });

  it('should allow fetching accounts manually', async () => {
    const mockAccounts = [{ _id: 'acc1', name: 'Checking', balance: 100, includeInTotal: true }];
    api.get.mockResolvedValue({ data: mockAccounts });

    const { result } = renderHook(() => useAccounts(false));
    expect(api.get).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.fetchAccounts();
    });

    expect(api.get).toHaveBeenCalledWith('/accounts');
    expect(result.current.accounts).toEqual(mockAccounts);
  });

  it('should add account, update account, and delete account successfully', async () => {
    const mockAccounts = [{ _id: 'acc1', name: 'Checking', balance: 100, includeInTotal: true }];
    api.get.mockResolvedValue({ data: mockAccounts });

    const { result } = renderHook(() => useAccounts());
    
    // Wait for initial fetch
    await act(async () => {
      // let useEffect complete
    });

    // Test addAccount
    const newAccount = { _id: 'acc2', name: 'Savings', balance: 500, includeInTotal: true };
    api.post.mockResolvedValue({ data: newAccount });

    await act(async () => {
      const added = await result.current.addAccount({ name: 'Savings', balance: 500, includeInTotal: true });
      expect(added).toEqual(newAccount);
    });

    expect(api.post).toHaveBeenCalledWith('/accounts', { name: 'Savings', balance: 500, includeInTotal: true });
    expect(result.current.accounts).toContainEqual(newAccount);
    expect(result.current.totalBalance).toBe(600); // 100 + 500

    // Test updateAccount
    const updatedAccount = { _id: 'acc2', name: 'Super Savings', balance: 550, includeInTotal: true };
    api.put.mockResolvedValue({ data: updatedAccount });

    await act(async () => {
      const updated = await result.current.updateAccount('acc2', { name: 'Super Savings', balance: 550 });
      expect(updated).toEqual(updatedAccount);
    });

    expect(api.put).toHaveBeenCalledWith('/accounts/acc2', { name: 'Super Savings', balance: 550 });
    expect(result.current.accounts.find(a => a._id === 'acc2')).toEqual(updatedAccount);

    // Test deleteAccount
    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.deleteAccount('acc2');
    });

    expect(api.delete).toHaveBeenCalledWith('/accounts/acc2');
    expect(result.current.accounts.find(a => a._id === 'acc2')).toBeUndefined();
  });
});
