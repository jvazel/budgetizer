import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForecastChart from '../ForecastChart';
import { useAccounts } from '../../../hooks/useAccounts';
import api from '../../../services/api';

vi.mock('../../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      { _id: 'acc1', name: 'Compte Courant', balance: 1500, type: 'checking', currency: 'EUR' }
    ]
  })
}));

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn()
  }
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
  ComposedChart: ({ children, onClick }) => (
    <div data-testid="recharts-composed-chart" onClick={() => onClick({ activePayload: [{ payload: { month: '2026-06', isForecast: true, projBalance: 2000 } }] })}>
      {children}
    </div>
  ),
  Area: () => null,
  Bar: () => null,
  Line: () => null,
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

describe('ForecastChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ForecastChart />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    // API mock returns a promise that resolves
    api.get.mockReturnValue(new Promise(() => {})); // Never resolves to keep loading state

    renderComponent();

    expect(screen.getByText('Méthode de calcul')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders statistical forecast data successfully', async () => {
    const mockData = {
      historicalData: [
        { month: '2026-04', income: 1000, expenses: 800, balance: 1200 },
        { month: '2026-05', income: 1100, expenses: 900, balance: 1400 }
      ],
      forecast: [
        { 
          month: '2026-06', 
          projectedIncome: 1200, 
          projectedExpenses: 950, 
          projectedBalance: 1650,
          confidenceInterval: { low: 1500, high: 1800 }
        }
      ],
      trend: 'positive'
    };

    api.get.mockResolvedValue({ data: mockData });

    renderComponent();

    // Wait for loading to finish and stats card to render
    await waitFor(() => {
      expect(screen.getByText(/Solde Estimé/)).toBeInTheDocument();
    });

    // Check projected balance displays
    expect(screen.getByText(/1\s*650/)).toBeInTheDocument();
    expect(screen.getByText('Hausse')).toBeInTheDocument();
  });

  it('opens drill-down bottom sheet and handles null selectedMonth balance safely on click', async () => {
    const mockData = {
      historicalData: [
        { month: '2026-04', income: 1000, expenses: 800, balance: 1200 }
      ],
      forecast: [
        { 
          month: '2026-06', 
          projectedIncome: 1200, 
          projectedExpenses: 950, 
          projectedBalance: 1650,
          confidenceInterval: { low: 1500, high: 1800 }
        }
      ],
      trend: 'stable'
    };

    api.get.mockResolvedValue({ data: mockData });
    // Mock future transactions endpoint call
    api.get.mockImplementation((url) => {
      if (url.includes('/charts/future')) {
        return Promise.resolve({ data: { futureTransactions: [] } });
      }
      return Promise.resolve({ data: mockData });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('recharts-composed-chart')).toBeInTheDocument();
    });

    // Simulate clicking on the chart point
    const chart = screen.getByTestId('recharts-composed-chart');
    fireEvent.click(chart);

    // Verify drill-down sheet opens with correct data and no TypeError crash occurred
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    expect(screen.getByText(/Détail : Juin 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Solde projeté/)).toBeInTheDocument();
  });
});
