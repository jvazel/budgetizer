import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionFormSheet from '../TransactionFormSheet';

// Mock hooks
const mockAddTransaction = vi.fn().mockResolvedValue({});
const mockUpdateTransaction = vi.fn().mockResolvedValue({});
const mockAccounts = [
  { _id: 'acc1', name: 'Compte Courant', balance: 1200, currency: 'EUR' },
  { _id: 'acc2', name: 'Épargne', balance: 5000, currency: 'EUR' }
];
const mockCategoriesTree = {
  expense: [
    { _id: 'cat1', name: 'Alimentation', icon: '🍔', children: [] }
  ],
  income: [
    { _id: 'cat2', name: 'Salaire', icon: '💼', children: [] }
  ]
};

vi.mock('../../../hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: mockAccounts })
}));

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({ categoriesTree: mockCategoriesTree })
}));

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    addTransaction: mockAddTransaction,
    updateTransaction: mockUpdateTransaction
  })
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('TransactionFormSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<TransactionFormSheet isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders form fields when open', () => {
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Nouvelle transaction')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dépense' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revenu' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Compte')).toBeInTheDocument();
    expect(screen.getByLabelText('Catégorie')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Note (optionnel)')).toBeInTheDocument();
  });

  it('changes type from Expense to Income and filters categories', () => {
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);
    
    // Default is expense, check category list contains Alimentation
    const categorySelect = screen.getByLabelText('Catégorie');
    expect(screen.getByText('Alimentation')).toBeInTheDocument();
    
    // Switch to income
    const incomeBtn = screen.getByRole('button', { name: 'Revenu' });
    fireEvent.click(incomeBtn);
    
    // Check category list now contains Salaire
    expect(screen.getByText('Salaire')).toBeInTheDocument();
    expect(screen.queryByText('Alimentation')).not.toBeInTheDocument();
  });

  it('allows filling inputs and submitting the form', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    
    render(
      <TransactionFormSheet 
        isOpen={true} 
        onClose={handleClose} 
        onSuccess={handleSuccess} 
      />
    );

    // Enter amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '45.50' } });

    // Enter note
    const noteInput = screen.getByLabelText('Note (optionnel)');
    fireEvent.change(noteInput, { target: { value: 'Courses hebdomadaires' } });

    // Select account (default is first account)
    const accountSelect = screen.getByLabelText('Compte');
    expect(accountSelect.value).toBe('acc1');

    // Select category
    const categorySelect = screen.getByLabelText('Catégorie');
    fireEvent.change(categorySelect, { target: { value: 'cat1' } });

    // Click submit button
    const submitBtn = screen.getByRole('button', { name: 'Ajouter la transaction' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith({
        type: 'expense',
        amount: 45.5,
        accountId: 'acc1',
        categoryId: 'cat1',
        note: 'Courses hebdomadaires',
        date: expect.any(Date)
      });
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('populates fields when editing an existing transaction', () => {
    const transactionToEdit = {
      _id: 'tx123',
      type: 'income',
      amount: 1500,
      accountId: 'acc2',
      categoryId: 'cat2',
      note: 'Mon salaire',
      date: '2026-06-01T00:00:00.000Z'
    };

    render(
      <TransactionFormSheet 
        isOpen={true} 
        onClose={() => {}} 
        transactionToEdit={transactionToEdit} 
      />
    );

    expect(screen.getByText('Modifier la transaction')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00').value).toBe('1500');
    expect(screen.getByLabelText('Compte').value).toBe('acc2');
    expect(screen.getByLabelText('Note (optionnel)').value).toBe('Mon salaire');
    expect(screen.getByRole('button', { name: 'Enregistrer les modifications' })).toBeInTheDocument();
  });
});
