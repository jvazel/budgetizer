import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetActualChart from '../BudgetActualChart';
import api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn()
  }
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
  BarChart: ({ children, layout }) => <div data-testid="recharts-bar-chart" data-layout={layout}>{children}</div>,
  Bar: ({ children, onClick }) => {
    // If a click handler is provided, we expose a button to trigger it
    return (
      <div data-testid="recharts-bar">
        {onClick && (
          <button 
            data-testid="bar-click-trigger" 
            onClick={() => onClick({ categoryId: 'cat1', name: 'Alimentation', real: 120, budget: 150, percentage: 80, categoryIcon: '🍔' })}
          >
            Click Bar
          </button>
        )}
        {children}
      </div>
    );
  },
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null
}));

// Mock BottomSheet
vi.mock('../../ui/BottomSheet', () => ({
  default: ({ children, isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="bottom-sheet">
        <button data-testid="close-bottom-sheet" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  )
}));

describe('BudgetActualChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <BudgetActualChart />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    api.get.mockReturnValue(new Promise(() => {})); // Never resolves to keep loading state

    renderComponent();

    expect(screen.getByText('Comparatif par Budget')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders budget data successfully', async () => {
    const mockBudgets = [
      {
        _id: 'b1',
        amount: 200,
        spent: 150,
        percentage: 75,
        categoryId: { _id: 'cat1', name: 'Alimentation', icon: '🍔' }
      },
      {
        _id: 'b2',
        amount: 100,
        spent: 120,
        percentage: 120,
        categoryId: { _id: 'cat2', name: 'Loisirs', icon: '🎮' }
      }
    ];

    api.get.mockResolvedValue({ data: mockBudgets });

    renderComponent();

    // Wait for the data to load
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });

    // Check key metrics are rendered
    expect(screen.getByText(/Total Budgété \/ Dépensé/)).toBeInTheDocument();
    expect(screen.getByText(/270,00 €/)).toBeInTheDocument(); // spent
    expect(screen.getByText(/\/ 300,00 €/)).toBeInTheDocument(); // budgeted

    // Under control / exceeded counts
    expect(screen.getByText('Respectés :')).toBeInTheDocument();
    expect(screen.getByText('Dépassés :')).toBeInTheDocument();

    // Custom budget cards should render
    expect(screen.getByText('Alimentation')).toBeInTheDocument();
    expect(screen.getByText('Loisirs')).toBeInTheDocument();
  });

  it('opens drill-down bottom sheet and loads transaction list on bar click', async () => {
    const mockBudgets = [
      {
        _id: 'b1',
        amount: 200,
        spent: 150,
        percentage: 75,
        categoryId: { _id: 'cat1', name: 'Alimentation', icon: '🍔' }
      }
    ];

    const mockTransactions = [
      { _id: 't1', description: 'Supermarché', amount: 80, type: 'expense', date: '2026-06-02T12:00:00Z', note: 'Courses' },
      { _id: 't2', description: 'Boulangerie', amount: 40, type: 'expense', date: '2026-06-03T12:00:00Z' }
    ];

    // Mock API requests
    api.get.mockImplementation((url) => {
      if (url.includes('/transactions')) {
        return Promise.resolve({ data: { transactions: mockTransactions } });
      }
      return Promise.resolve({ data: mockBudgets });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('bar-click-trigger')).toBeInTheDocument();
    });

    // Click on the bar trigger
    fireEvent.click(screen.getByTestId('bar-click-trigger'));

    // Check if bottom sheet is shown
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    expect(screen.getByText(/Dépenses : Alimentation/)).toBeInTheDocument();

    // Check if transaction list loaded
    await waitFor(() => {
      expect(screen.getByText('Supermarché')).toBeInTheDocument();
      expect(screen.getByText('Boulangerie')).toBeInTheDocument();
    });

    // Check amount formats
    expect(screen.getByText('-80,00 €')).toBeInTheDocument();
    expect(screen.getByText('-40,00 €')).toBeInTheDocument();
  });
});
