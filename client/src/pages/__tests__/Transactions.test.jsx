import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Transactions from '../Transactions';
import { AuthContext } from '../../context/AuthContext';

// Mocks
const mockTransactions = [
  {
    _id: 'tx1',
    type: 'expense',
    amount: 25.5,
    description: 'Course alimentaire',
    date: '2026-06-12T10:00:00.000Z',
    accountId: { _id: 'acc1', name: 'Compte Courant', color: '#3b82f6' },
    categoryId: { _id: 'cat1', name: 'Alimentation', icon: '🍔', color: '#ef4444' },
    tags: [{ _id: 'tag1', name: 'Vacances', color: '#10b981' }]
  },
  {
    _id: 'tx2',
    type: 'income',
    amount: 1500,
    description: 'Salaire',
    date: '2026-06-01T08:00:00.000Z',
    accountId: { _id: 'acc1', name: 'Compte Courant', color: '#3b82f6' },
    categoryId: { _id: 'cat2', name: 'Salaire', icon: '💼', color: '#10b981' },
    tags: []
  }
];

const mockAccounts = [
  { _id: 'acc1', name: 'Compte Courant', balance: 1000 },
  { _id: 'acc2', name: 'Livret A', balance: 5000 }
];

const mockCategories = [
  { _id: 'cat1', name: 'Alimentation', icon: '🍔', color: '#ef4444', type: 'expense' },
  { _id: 'cat2', name: 'Salaire', icon: '💼', color: '#10b981', type: 'income' }
];

const mockTags = [
  { _id: 'tag1', name: 'Vacances', color: '#10b981' },
  { _id: 'tag2', name: 'Perso', color: '#3b82f6' }
];

const mockSavedFilters = [
  {
    _id: 'sf1',
    name: 'Filtre Spécial',
    filters: {
      search: 'Course',
      accountId: 'acc1',
      categoryId: 'cat1',
      type: 'expense',
      tags: 'tag1'
    }
  }
];

vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: vi.fn((filters) => ({
    transactions: mockTransactions,
    loading: false,
    deleteTransaction: vi.fn(),
    addTransaction: vi.fn(),
    updateTransaction: vi.fn()
  }))
}));

vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: mockAccounts,
    loading: false
  })
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockCategories,
    categoriesTree: { expense: mockCategories, income: [], transfer: [] },
    loading: false
  })
}));

vi.mock('../../hooks/useTags', () => ({
  useTags: () => ({
    tags: mockTags,
    loading: false
  })
}));

vi.mock('../../hooks/useSavedFilters', () => ({
  useSavedFilters: () => ({
    savedFilters: mockSavedFilters,
    addSavedFilter: vi.fn(),
    updateSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn()
  })
}));

vi.mock('../../components/layout/AppShell', () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>,
  HeaderTitle: ({ children }) => <h1>{children}</h1>,
  HeaderActions: ({ children }) => <div data-testid="header-actions">{children}</div>
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Transactions Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: { id: 'user123' } }}>
        <MemoryRouter>
          <Transactions />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders the transactions page and lists mock transactions', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByText('Course alimentaire')).toBeInTheDocument();
    expect(screen.getAllByText('Salaire').length).toBeGreaterThan(0);
    expect(screen.getByText('Ce mois')).toBeInTheDocument();
  });

  it('supports monthly navigation using previous/next buttons', async () => {
    renderComponent();

    const prevButton = screen.getByTitle('Mois précédent');
    const nextButton = screen.getByTitle('Mois suivant');

    // Next button should be disabled for the current month
    expect(nextButton).toBeDisabled();

    // Click previous month
    fireEvent.click(prevButton);

    // It should update the label (e.g. from Ce mois to a specific month like Mai 2026 or similar depending on the date)
    // Let's check if "Ce mois" changed to a month format
    expect(screen.queryByText('Ce mois')).not.toBeInTheDocument();

    // Next button should now be enabled
    expect(nextButton).not.toBeDisabled();
  });

  it('opens the bottom sheet to select a month', async () => {
    renderComponent();

    // Click on month period label/selector
    const selectorButton = screen.getByText('Ce mois');
    fireEvent.click(selectorButton);

    // Bottom sheet options should be visible
    expect(screen.getByText(/Choisir la période/)).toBeInTheDocument();
    
    // There should be a "Toutes les dates" button inside the bottom sheet
    const optionButtons = screen.getAllByRole('button', { name: 'Toutes les dates' });
    expect(optionButtons.length).toBeGreaterThan(0);

    // Click on "Toutes les dates" option
    fireEvent.click(optionButtons[0]);

    // Bottom sheet should close, and period label on header should update.
    // The "Ce mois" label should be gone, and "Toutes les dates" should be present.
    expect(screen.queryByText('Ce mois')).not.toBeInTheDocument();
    expect(screen.getAllByText('Toutes les dates').length).toBeGreaterThan(0);
  });

  it('updates query logic and switches period to all when custom dates are filled', async () => {
    renderComponent();

    // Open filter sheet
    const filterToggle = screen.getByTestId('header-actions').querySelector('button:last-child');
    fireEvent.click(filterToggle);

    expect(screen.getByText('Filtres Avancés')).toBeInTheDocument();

    // Check that we can inputs start/end date
    const startDateInput = screen.getByLabelText(/Du/i);
    const endDateInput = screen.getByLabelText(/Au/i);

    fireEvent.change(startDateInput, { target: { value: '2026-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-06-15' } });

    // Verify custom dates are set in DOM
    expect(startDateInput.value).toBe('2026-06-01');
    expect(endDateInput.value).toBe('2026-06-15');

    // And verify that period was automatically switched to "Toutes les dates"
    expect(screen.getByText('Toutes les dates')).toBeInTheDocument();
  });
});
