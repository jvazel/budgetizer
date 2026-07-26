import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResilienceChart from '../ResilienceChart';

// Mock useDashboard hook
vi.mock('../../../hooks/useDashboard', () => ({
  useDashboard: () => ({
    data: {
      totalBalance: 25000,
      month: {
        income: 4200,
        expenses: 3200
      }
    },
    loading: false,
    error: null,
    refreshDashboard: vi.fn()
  })
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
  ComposedChart: ({ children }) => <div data-testid="recharts-composed-chart">{children}</div>,
  Area: () => <div data-testid="recharts-area" />,
  Line: () => <div data-testid="recharts-line" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null
}));

describe('ResilienceChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ResilienceChart />
      </MemoryRouter>
    );
  };

  it('renders simulation banner and initial values correctly', async () => {
    renderComponent();

    // Verify header exists
    expect(screen.getByText('Simulation Monte Carlo')).toBeInTheDocument();
    expect(screen.getByText(/Projetez la résilience/)).toBeInTheDocument();

    // Default pre-filled values verification:
    // Capital: 25000 (totalBalance)
    // Savings: 1000 (income: 4200 - expenses: 3200)
    await waitFor(() => {
      const capitalInput = screen.getByLabelText(/Capital Initial/i);
      const savingsInput = screen.getByLabelText(/Épargne Mensuelle/i);

      expect(capitalInput).toHaveValue(25000);
      expect(savingsInput).toHaveValue(1000);
    });

    // Score de Résilience should be calculated (100% with these healthy numbers)
    expect(screen.getByText('Score de Résilience')).toBeInTheDocument();
    expect(screen.getAllByText(/100%/).length).toBeGreaterThan(0);
    expect(screen.getByText('Plan financier très robuste')).toBeInTheDocument();
  });

  it('toggles configuration details panel when header button is clicked', async () => {
    renderComponent();

    const configButton = screen.getByText(/Configuration des paramètres/i);
    
    // Config panel is open by default
    expect(screen.getByLabelText(/Capital Initial/i)).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(configButton);
    expect(screen.queryByLabelText(/Capital Initial/i)).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(configButton);
    expect(screen.getByLabelText(/Capital Initial/i)).toBeInTheDocument();
  });

  it('changes investment preset parameters on profile button click', async () => {
    renderComponent();

    // Default preset is "balanced" (expectedReturn: 5.0%, volatility: 8.0%)
    expect(screen.getByText('Rendement annuel')).toBeInTheDocument();
    expect(screen.getByLabelText(/Rendement annuel/i)).toHaveValue("5");
    expect(screen.getByLabelText(/Volatilité attendue/i)).toHaveValue("8");

    // Click on "Prudent" preset
    const prudentButton = screen.getByRole('button', { name: /Prudent/i });
    fireEvent.click(prudentButton);

    // Prudent should set Return to 2.5% and Volatility to 2.0%
    expect(screen.getByLabelText(/Rendement annuel/i)).toHaveValue("2.5");
    expect(screen.getByLabelText(/Volatilité attendue/i)).toHaveValue("2");

    // Click on "Dynamique" preset
    const dynamicButton = screen.getByRole('button', { name: /Dynamique/i });
    fireEvent.click(dynamicButton);

    // Dynamic should set Return to 8.0% and Volatility to 16.0%
    expect(screen.getByLabelText(/Rendement annuel/i)).toHaveValue("8");
    expect(screen.getByLabelText(/Volatilité attendue/i)).toHaveValue("16");
  });

  it('updates input capital and savings values, affecting the resilience score', async () => {
    renderComponent();

    const capitalInput = screen.getByLabelText(/Capital Initial/i);
    const savingsInput = screen.getByLabelText(/Épargne Mensuelle/i);

    // Set negative or very low values to trigger high risk/vulnérabilité
    fireEvent.change(capitalInput, { target: { value: 100 } });
    fireEvent.change(savingsInput, { target: { value: 0 } });

    // Enable high shocks
    const activeShocksSlider = screen.getByLabelText(/Coût moyen estimé/i);
    fireEvent.change(activeShocksSlider, { target: { value: 30000 } });

    // Check if score changed to vulnerable/danger indicator
    await waitFor(() => {
      expect(screen.getByText('⚠️ Vulnérabilité financière élevée')).toBeInTheDocument();
    });
  });
});
