import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransfersPage from '../TransfersPage';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Mock hooks
const mockAccounts = [
  { _id: 'acc1', name: 'Compte Courant', balance: 500, currency: 'EUR' },
  { _id: 'acc2', name: 'Épargne', balance: 5000, currency: 'EUR' }
];

const mockAddTransaction = vi.fn().mockResolvedValue({});
const mockFetchAccounts = vi.fn().mockResolvedValue({});

vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: mockAccounts,
    loading: false,
    fetchAccounts: mockFetchAccounts
  })
}));

vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [],
    loading: false,
    addTransaction: mockAddTransaction,
    deleteTransaction: vi.fn()
  })
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('TransfersPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: { id: 'user123' } }}>
        <MemoryRouter>
          <TransfersPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders correctly with default accounts', () => {
    renderComponent();

    expect(screen.getByText('Nouveau Virement')).toBeInTheDocument();
    expect(screen.getByLabelText(/Débiter \(Source\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Créditer \(Destination\)/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('validates amount and balance before opening confirmation modal', async () => {
    renderComponent();

    const amountInput = screen.getByPlaceholderText('0.00');

    // Enter transfer amount exceeding balance (balance is 500, enter 600)
    fireEvent.change(amountInput, { target: { value: '600' } });

    const submitBtn = screen.getByRole('button', { name: 'Confirmer le virement' });
    fireEvent.click(submitBtn);

    // Toast error should be called (mocked)
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Solde insuffisant'));
  });

  it('opens confirmation modal on valid inputs and executes transfer', async () => {
    renderComponent();

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '150' } });

    const submitBtn = screen.getByRole('button', { name: 'Confirmer le virement' });
    fireEvent.click(submitBtn);

    // Modal should be shown (querying heading specifically to avoid matching button text)
    expect(screen.getByRole('heading', { name: 'Confirmer le virement' })).toBeInTheDocument();
    expect(screen.getByText(/Vous êtes sur le point de transférer/)).toBeInTheDocument();

    // Click confirm inside modal
    const confirmBtn = screen.getByRole('button', { name: 'Valider le virement' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith({
        type: 'transfer',
        accountId: 'acc1',
        toAccountId: 'acc2',
        amount: 150,
        description: 'Virement instantané',
        date: expect.any(Date),
        note: ''
      });
      expect(mockFetchAccounts).toHaveBeenCalled();
    });
  });
});
