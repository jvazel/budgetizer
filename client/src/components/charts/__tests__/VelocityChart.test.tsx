import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VelocityChart from '../VelocityChart';
import { useBudgets } from '../../../hooks/useBudgets';
import { useTransactions } from '../../../hooks/useTransactions';

// Mock custom hooks
vi.mock('../../../hooks/useBudgets', () => ({
  useBudgets: vi.fn()
}));

vi.mock('../../../hooks/useTransactions', () => ({
  useTransactions: vi.fn()
}));

describe('VelocityChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set a fixed date using fake timers but only mocking Date to avoid breaking waitFor
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 Juin 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(<VelocityChart />);
  };

  it('renders loading state when hooks are loading', () => {
    useBudgets.mockReturnValue({ budgets: [], loading: true });
    useTransactions.mockReturnValue({ transactions: [], loading: false });

    renderComponent();

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when no budgets are defined', () => {
    useBudgets.mockReturnValue({ budgets: [], loading: false });
    useTransactions.mockReturnValue({ transactions: [], loading: false });

    renderComponent();

    expect(screen.getByText('Aucun budget défini')).toBeInTheDocument();
    expect(screen.getByText(/Veuillez configurer un budget mensuel/)).toBeInTheDocument();
  });

  it('calculates velocity and displays Cas 1 (Vitesse sous contrôle) correctly', () => {
    const mockBudgets = [
      {
        _id: 'b1',
        amount: 300,
        spent: 100, // remaining = 200, remaining days = 30 - 15 + 1 = 16 days. Target velocity = 200 / 16 = 12.5 €/jour
        percentage: 33.3,
        categoryId: { _id: 'cat1', name: 'Alimentation', icon: '🍔' }
      }
    ];

    // Current day is 15 >= 7, so daysCount = 7.
    // Total spent over last 7 days = 35 €. Actual velocity = 35 / 7 = 5 €/jour
    const mockTransactions = [
      { _id: 't1', amount: 10, type: 'expense', categoryId: 'cat1', date: '2026-06-12T12:00:00Z' },
      { _id: 't2', amount: 25, type: 'expense', categoryId: 'cat1', date: '2026-06-14T12:00:00Z' }
    ];

    useBudgets.mockReturnValue({ budgets: mockBudgets, loading: false });
    useTransactions.mockReturnValue({ transactions: mockTransactions, loading: false });

    renderComponent();

    // Key titles should be visible
    expect(screen.getByText('Tachymètre : Rythme de vos dépenses')).toBeInTheDocument();
    expect(screen.getByText('Vitesse sous contrôle')).toBeInTheDocument();

    // Checks velocities display. Note: formatCurrency matches local (e.g. 5,00 € or 5.00 € depending on environment)
    expect(screen.getAllByText(/5,00/).length).toBeGreaterThan(0); // actual velocity (5 €)
    expect(screen.getAllByText(/12,50/).length).toBeGreaterThan(0); // target velocity (12.50 €)
  });

  it('displays Cas 2 (Excès de vitesse) & Cas 3 (Action corrective) when overspending', () => {
    const mockBudgets = [
      {
        _id: 'b1',
        amount: 300,
        spent: 100, // remaining = 200. remaining days = 16. Target velocity = 12.5 €/jour
        percentage: 33.3,
        categoryId: { _id: 'cat1', name: 'Alimentation', icon: '🍔' }
      }
    ];

    // Total spent over last 7 days = 140 €. Actual velocity = 140 / 7 = 20 €/jour
    // actual (20) > target (12.5) -> Over speed warning!
    // depletion days = 200 / 20 = 10 days. Date = 15 + 10 = 25 Juin 2026
    const mockTransactions = [
      { _id: 't1', amount: 90, type: 'expense', categoryId: 'cat1', date: '2026-06-12T12:00:00Z' },
      { _id: 't2', amount: 50, type: 'expense', categoryId: 'cat1', date: '2026-06-14T12:00:00Z' }
    ];

    useBudgets.mockReturnValue({ budgets: mockBudgets, loading: false });
    useTransactions.mockReturnValue({ transactions: mockTransactions, loading: false });

    renderComponent();

    expect(screen.getByText(/Excès de vitesse détecté/)).toBeInTheDocument();
    expect(screen.getByText(/25 juin 2026/)).toBeInTheDocument(); // depletion date
    expect(screen.getByText('Action corrective proposée')).toBeInTheDocument();
  });

  it('allows selecting categories via the dropdown selector', async () => {
    const mockBudgets = [
      {
        _id: 'b1',
        amount: 300,
        spent: 100,
        categoryId: { _id: 'cat1', name: 'Alimentation', icon: '🍔' }
      },
      {
        _id: 'b2',
        amount: 150,
        spent: 50,
        categoryId: { _id: 'cat2', name: 'Loisirs', icon: '🎮' }
      }
    ];

    useBudgets.mockReturnValue({ budgets: mockBudgets, loading: false });
    useTransactions.mockReturnValue({ transactions: [], loading: false });

    renderComponent();

    // Default dropdown state
    const dropdownButton = screen.getByText('Toutes dépenses confondues');
    expect(dropdownButton).toBeInTheDocument();

    // Click dropdown to open
    fireEvent.click(dropdownButton);

    // Categories in dropdown should be visible
    expect(screen.getByText('Alimentation')).toBeInTheDocument();
    expect(screen.getByText('Loisirs')).toBeInTheDocument();

    // Click category Loisirs
    fireEvent.click(screen.getByText('Loisirs'));

    // Dropdown value should change to Loisirs
    await waitFor(() => {
      expect(screen.queryByText('Toutes dépenses confondues')).not.toBeInTheDocument();
      expect(screen.getByText('Loisirs')).toBeInTheDocument();
    });
  });
});
