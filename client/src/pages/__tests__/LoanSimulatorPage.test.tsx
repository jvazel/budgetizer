import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoanSimulatorPage from '../LoanSimulatorPage';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn()
  }
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
  };
});

vi.mock('../../components/layout/AppShell', () => ({
  HeaderTitle: ({ children }) => <h1>{children}</h1>,
  HeaderBackButton: () => <button>Back</button>,
  HeaderPortalContext: React.createContext({ isScrolled: false })
}));

describe('LoanSimulatorPage Component', () => {
  const mockUser = {
    id: 'user_123',
    name: 'Johan V',
    email: 'johan@example.com',
    currency: { code: 'EUR', symbol: '€' },
    preferences: { theme: 'dark' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        summaries: [
          { month: '2026-06', income: 4000, expenses: 2000 },
          { month: '2026-05', income: 4200, expenses: 2100 }
        ]
      }
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser }}>
          <LoanSimulatorPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('should render page title and calculate default loan options correctly', async () => {
    renderComponent();

    // Check that title is rendered
    expect(screen.getAllByText('Simulateur de prêt').length).toBeGreaterThan(0);

    // Verify it loads dashboard summaries
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/dashboard/monthly-summaries');
    });

    // Check defaults
    expect(screen.getByLabelText('Montant emprunté')).toHaveValue(200000);
    expect(screen.getByLabelText('Taux annuel')).toHaveValue(3.5);
    expect(screen.getByLabelText('Durée')).toHaveValue(20);
  });

  it('should update results when user changes inputs', async () => {
    renderComponent();

    // Change Principal
    const amountInput = screen.getByLabelText('Montant emprunté');
    fireEvent.change(amountInput, { target: { value: '100000' } });

    // Change Rate
    const rateInput = screen.getByLabelText('Taux annuel');
    fireEvent.change(rateInput, { target: { value: '4.0' } });

    // Change Duration
    const durationInput = screen.getByLabelText('Durée');
    fireEvent.change(durationInput, { target: { value: '10' } });

    // Verify recalculations
    // For 100k at 4% for 10 years (120 months) and default deposit (20k, so effective principal 80k):
    // For 80k at 4% for 10 years (120 months):
    // Monthly payment formula results in: 809.96 €. Plus 50 € insurance = 859.96 € (~860 €).
    await screen.findByText("Mensualité totale");
    await waitFor(() => {
      const kpiParagraph = document.querySelector('p.text-xl');
      expect(kpiParagraph).toBeTruthy();
      expect(kpiParagraph.textContent).toContain('860');
    });
  });
});
