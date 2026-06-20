import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

vi.mock('../../../hooks/useTags', () => ({
  useTags: () => ({
    tags: [
      { _id: 'tag1', name: 'Vacances', color: '#3b82f6' }
    ],
    addTag: vi.fn().mockResolvedValue({ _id: 'tag_new', name: 'Nouveau', color: '#10b981' })
  })
}));

vi.mock('../../../hooks/useBudgets', () => ({
  useBudgets: () => ({
    budgets: [],
    loading: false,
    addBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn()
  })
}));


const mockTransactions = [
  { _id: 'tx1', note: 'Starbucks', amount: 4.50, accountId: 'acc1', categoryId: 'cat1', type: 'expense', date: '2026-06-18', tags: ['tag1'] },
  { _id: 'tx2', note: 'Starbucks', amount: 4.80, accountId: 'acc1', categoryId: 'cat1', type: 'expense', date: '2026-06-17', tags: ['tag1'] },
  { _id: 'tx3', note: 'Netflix', amount: 15.99, accountId: 'acc2', categoryId: 'cat1', type: 'expense', date: '2026-06-16', tags: [] }
];

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: (filters = {}) => ({
    transactions: filters.limit === 50 ? mockTransactions : [],
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

    // Enter amount and continue to Step 2
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(screen.getByLabelText('Compte')).toBeInTheDocument();
    expect(screen.getByLabelText('Catégorie')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Note (optionnel)')).toBeInTheDocument();
  });

  it('changes type from Expense to Income and filters categories', () => {
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);
    
    // Default is expense, switch to Income in step 1
    const incomeBtn = screen.getByRole('button', { name: 'Revenu' });
    fireEvent.click(incomeBtn);

    // Enter amount and continue to step 2
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    
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

    // Enter amount in step 1
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '45.50' } });

    // Continue to step 2
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    // Enter note in step 2
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
        date: expect.any(Date),
        tags: []
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
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
  });

  it('saves and pre-fills account and category from localStorage', async () => {
    localStorage.clear();

    const handleClose = vi.fn();
    const { rerender } = render(
      <TransactionFormSheet 
        isOpen={true} 
        onClose={handleClose} 
      />
    );

    // Enter amount and continue to step 2
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    // Default should be acc1
    expect(screen.getByLabelText('Compte').value).toBe('acc1');
    expect(screen.getByLabelText('Catégorie').value).toBe('');

    // Fill category and account
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'cat1' } });
    fireEvent.change(screen.getByLabelText('Compte'), { target: { value: 'acc2' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la transaction' }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
      // Check that it saved to localStorage
      expect(localStorage.getItem('budgetizer_last_account_id')).toBe('acc2');
      expect(localStorage.getItem('budgetizer_last_expense_category_id')).toBe('cat1');
    });

    // Close and open a new form sheet to verify pre-fill
    rerender(<TransactionFormSheet isOpen={false} onClose={handleClose} />);
    rerender(<TransactionFormSheet isOpen={true} onClose={handleClose} />);

    // Enter amount and continue to step 2
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(screen.getByLabelText('Compte').value).toBe('acc2');
    expect(screen.getByLabelText('Catégorie').value).toBe('cat1');
  });

  it('handles Enter key navigation between fields and triggers submit', async () => {
    const handleClose = vi.fn();
    render(
      <TransactionFormSheet 
        isOpen={true} 
        onClose={handleClose} 
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');

    // Fill amount and hit enter to switch to step 2
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.keyDown(amountInput, { key: 'Enter', code: 'Enter' });

    // Now noteInput is rendered in step 2
    const noteInput = screen.getByLabelText('Note (optionnel)');

    // Type note and hit enter to submit
    fireEvent.change(noteInput, { target: { value: 'Déjeuner' } });
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'cat1' } });
    
    fireEvent.keyDown(noteInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('loads default templates when localStorage is empty', () => {
    localStorage.clear();
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('Déjeuner')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('applies a template to the form fields on click', () => {
    localStorage.clear();
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);

    // Click 'Café' template
    fireEvent.click(screen.getByText('Café'));

    expect(screen.getByPlaceholderText('0.00').value).toBe('2.50');
    
    // Click Continuer to see step 2 note field
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByLabelText('Note (optionnel)').value).toBe('Café');
  });

  it('allows saving current form inputs as a new template', () => {
    localStorage.clear();
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('Cookies');

    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);

    // Fill amount in step 1
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '4.50' } });
    
    // Save template is in step 1
    fireEvent.click(screen.getByText('＋ Favori'));

    expect(promptMock).toHaveBeenCalled();
    expect(screen.getByText('Cookies')).toBeInTheDocument();

    promptMock.mockRestore();
  });

  it('displays autocomplete suggestion bubbles based on note input matching', () => {
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);

    // Enter amount and continue
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    // Type "Sta" in note
    const noteInput = screen.getByLabelText('Note (optionnel)');
    fireEvent.change(noteInput, { target: { value: 'Sta' } });

    // Expect 'Starbucks' suggestion bubble to appear
    expect(screen.getByRole('button', { name: /Starbucks/ })).toBeInTheDocument();
  });

  it('applies predicted category and account when clicking a suggestion bubble', () => {
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);

    // Enter amount and continue
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    const noteInput = screen.getByLabelText('Note (optionnel)');
    fireEvent.change(noteInput, { target: { value: 'Sta' } });

    // Click 'Starbucks' bubble
    fireEvent.click(screen.getByRole('button', { name: /Starbucks/ }));

    // Expect note to be completed, account and category prefilled
    expect(noteInput.value).toBe('Starbucks');
    expect(screen.getByLabelText('Compte').value).toBe('acc1');
    expect(screen.getByLabelText('Catégorie').value).toBe('cat1');
  });

  it('auto-predicts and fills category and account on exact match loss of focus (onBlur)', () => {
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);

    // Enter amount and continue
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    const noteInput = screen.getByLabelText('Note (optionnel)');
    
    // Type exact string "netflix" (case-insensitive) and trigger blur
    fireEvent.change(noteInput, { target: { value: 'netflix' } });
    fireEvent.blur(noteInput);

    // Expect category and account to be filled according to predictions (acc2, cat1)
    expect(screen.getByLabelText('Compte').value).toBe('acc2');
    expect(screen.getByLabelText('Catégorie').value).toBe('cat1');
  });

  it('allows deleting a template via long press', async () => {
    localStorage.clear();
    
    render(<TransactionFormSheet isOpen={true} onClose={() => {}} />);
    
    // Default template 'Café' should be in the document
    const cafeBtn = screen.getByText('Café');
    expect(cafeBtn).toBeInTheDocument();
    
    // Simulate long press: mousedown and wait 700ms
    fireEvent.mouseDown(cafeBtn);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 700));
    });
    
    // The ConfirmModal should be open
    expect(screen.getByText('Supprimer le favori')).toBeInTheDocument();
    expect(screen.getByText(/Êtes-vous sûr de vouloir supprimer le favori/)).toBeInTheDocument();
    
    // Click the "Supprimer" confirm button
    const deleteConfirmBtn = screen.getByRole('button', { name: 'Supprimer' });
    fireEvent.click(deleteConfirmBtn);
    
    // Expect Café template to be removed from the document
    expect(screen.queryByText('Café')).not.toBeInTheDocument();
  });

  it('auto-predicts and fills associated tags when applying a suggestion', async () => {
    const handleClose = vi.fn();
    render(<TransactionFormSheet isOpen={true} onClose={handleClose} />);

    // Enter amount and continue
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    const noteInput = screen.getByLabelText('Note (optionnel)');
    fireEvent.change(noteInput, { target: { value: 'Sta' } });

    // Click Starbucks suggestion bubble
    fireEvent.click(screen.getByRole('button', { name: /Starbucks/ }));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la transaction' }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
        note: 'Starbucks',
        tags: ['tag1']
      }));
    });
  });
});
