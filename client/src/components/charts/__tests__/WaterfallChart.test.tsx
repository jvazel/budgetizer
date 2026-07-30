import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WaterfallChart from '../WaterfallChart';
import api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn()
  }
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
  BarChart: ({ children }) => (
    <div data-testid="recharts-bar-chart">
      {children}
    </div>
  ),
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null
}));

// Mock BottomSheet to test its rendered children directly
vi.mock('../../ui/BottomSheet', () => ({
  default: ({ children, isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="bottom-sheet">
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  )
}));

describe('WaterfallChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <WaterfallChart />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    api.get.mockReturnValue(new Promise(() => {})); // Never resolves to keep loading state

    renderComponent();

    expect(screen.getByText('Analyse mensuelle')).toBeInTheDocument();
    expect(document.querySelector('.shimmer-loader')).toBeInTheDocument();
  });

  it('renders waterfall chart data and KPIs successfully', async () => {
    const mockData = {
      totalIncome: 3000,
      totalExpenses: 1200,
      netSavings: 1800,
      categories: [
        { categoryId: 'cat_rent', name: 'Loyer', icon: '🏠', color: 'blue', amount: 800 },
        { categoryId: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange', amount: 400 }
      ]
    };

    api.get.mockResolvedValue({ data: mockData });

    renderComponent();

    // Wait for loading to finish and stats to render
    await waitFor(() => {
      expect(screen.getAllByText('Dépenses').length).toBeGreaterThan(0);
    });

    // Check KPIs display
    expect(screen.getByText(/3\s*000/)).toBeInTheDocument(); // totalIncome
    expect(screen.getByText(/1\s*200/)).toBeInTheDocument(); // totalExpenses
    expect(screen.getByText(/1\s*800/)).toBeInTheDocument(); // netSavings

    // Check category list displays
    expect(screen.getByText('Loyer')).toBeInTheDocument();
    expect(screen.getByText('-800,00 €')).toBeInTheDocument();
    expect(screen.getByText('Alimentation')).toBeInTheDocument();
    expect(screen.getByText('-400,00 €')).toBeInTheDocument();
  });

  it('navigates to previous and next month', async () => {
    const mockData = {
      totalIncome: 1000,
      totalExpenses: 500,
      netSavings: 500,
      categories: []
    };

    api.get.mockResolvedValue({ data: mockData });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Revenus').length).toBeGreaterThan(0);
    });

    // Click on previous month button
    const prevBtn = screen.getByTitle('Mois précédent');
    await act(async () => {
      fireEvent.click(prevBtn);
    });

    // Click on next month button
    const nextBtn = screen.getByTitle('Mois suivant');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(api.get).toHaveBeenCalledTimes(3); // Initial fetch + prev month + next month
  });

  it('renders empty state when there are no transactions', async () => {
    const mockData = {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      categories: []
    };

    api.get.mockResolvedValue({ data: mockData });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Aucune transaction pour ce mois.')).toBeInTheDocument();
    });
  });

  it('renders negative net savings (deficit) properly', async () => {
    const mockData = {
      totalIncome: 1000,
      totalExpenses: 1500,
      netSavings: -500,
      categories: [
        { categoryId: 'cat_rent', name: 'Loyer', icon: '🏠', color: 'blue', amount: 1500 }
      ]
    };

    api.get.mockResolvedValue({ data: mockData });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Déficit').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('500')).toBeInTheDocument();
  });
});

