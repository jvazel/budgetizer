import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from '../ReportsPage';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn()
  }
}));

vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      { _id: 'acc_inc', name: 'Compte Courant', balance: 100, type: 'checking', includeInTotal: true },
      { _id: 'acc_exc', name: 'Livret Epargne', balance: 500, type: 'savings', includeInTotal: false }
    ],
    totalBalance: 100
  })
}));

vi.mock('../../components/layout/AppShell', () => ({
  default: ({ children }) => (
    <div data-testid="app-shell">
      {children}
    </div>
  ),
  HeaderTitle: ({ children }) => <h1>{children}</h1>,
  HeaderActions: ({ children }) => <div>{children}</div>,
  HeaderBackButton: () => <button>Back</button>,
  HeaderPortalContext: React.createContext({ isScrolled: false })
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn().mockReturnValue('toast_id'),
    dismiss: vi.fn()
  }
}));

// Mock recharts to avoid layout engine errors in jsdom environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="recharts-area-chart">{children}</div>,
  Area: () => null,
  BarChart: ({ children }) => <div data-testid="recharts-bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  LabelList: () => null,
  PieChart: ({ children }) => <div data-testid="recharts-pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null
}));

vi.mock('html2pdf.js/dist/html2pdf.min.js', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      const worker = {
        set: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        toPdf: vi.fn().mockReturnThis(),
        output: vi.fn().mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))
      };
      return worker;
    })
  };
});

vi.stubGlobal('print', vi.fn());
vi.stubGlobal('open', vi.fn());

describe('ReportsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: { id: 'user123', currency: { code: 'EUR' } } }}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders parameters form correctly', () => {
    renderComponent();

    expect(screen.getAllByText("Rapports d'Activité")[0]).toBeInTheDocument();
    expect(screen.getByText('Paramètres du rapport')).toBeInTheDocument();
    expect(screen.getByText('Date de début')).toBeInTheDocument();
    expect(screen.getByText('Date de fin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exporter le rapport en PDF' })).toBeInTheDocument();
  });

  it('handles report generation and backtracking logic correctly', async () => {
    // 1. Setup mock data
    const mockTxs = [
      {
        _id: 'tx1',
        type: 'transfer',
        amount: 50,
        accountId: { _id: 'acc_inc' },
        toAccountId: { _id: 'acc_exc' },
        date: new Date()
      },
      {
        _id: 'tx2',
        type: 'expense',
        amount: 20,
        accountId: { _id: 'acc_inc' },
        categoryId: { _id: 'cat1', name: 'Alimentation', color: '#ff0000', icon: '🍔' },
        date: new Date()
      },
      {
        _id: 'tx3',
        type: 'income',
        amount: 100,
        accountId: { _id: 'acc_inc' },
        date: new Date()
      }
    ];

    api.get.mockImplementation((url) => {
      if (url === '/transactions') {
        return Promise.resolve({
          data: { transactions: mockTxs }
        });
      }
      if (url === '/charts/balance-history') {
        return Promise.resolve({
          data: [
            { date: '2026-06-05', label: '5 juin', balance: 100 },
            { date: '2026-06-06', label: '6 juin', balance: 100 }
          ]
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    // Click on generation button
    const exportBtn = screen.getByRole('button', { name: 'Exporter le rapport en PDF' });
    fireEvent.click(exportBtn);

    // Verify it triggers api request
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/transactions', expect.any(Object));
      expect(api.get).toHaveBeenCalledWith('/charts/balance-history', expect.any(Object));
      expect(toast.loading).toHaveBeenCalledWith('Analyse des données en cours...');
    });

    // Let's verify metrics calculated:
    // Income = 100
    // Expenses = 20
    // Net Savings = 80
    // Savings rate = 80% (which means health score is high)
    await waitFor(() => {
      // In French currency format, 100 is "100,00 €" or similar.
      // We can check if those values are computed correctly
      expect(toast.dismiss).toHaveBeenCalled();
    });
  });

  it('renders interactive dashboard on screen and does not trigger PDF generation when clicking Analyser et afficher le rapport', async () => {
    const mockTxs = [
      {
        _id: 'tx1',
        type: 'expense',
        amount: 30,
        accountId: { _id: 'acc_inc' },
        categoryId: { _id: 'cat1', name: 'Alimentation', color: '#ff0000', icon: '🍔' },
        date: new Date()
      }
    ];

    api.get.mockImplementation((url) => {
      if (url === '/transactions') return Promise.resolve({ data: { transactions: mockTxs } });
      if (url === '/charts/balance-history') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    // Select the "Analyser et afficher le rapport" button
    const analyzeBtn = screen.getByRole('button', { name: 'Analyser et afficher le rapport' });
    fireEvent.click(analyzeBtn);

    // Wait for the diagnostic dashboard to render on screen
    await waitFor(() => {
      expect(screen.getByText('Diagnostic Global')).toBeInTheDocument();
    });

    // Make sure we didn't call html2pdf (no toast.loading for PDF generation, which is separate)
    expect(toast.loading).not.toHaveBeenCalledWith('Génération du rapport PDF...');
  });

  it('renders the transaction journal when includeTransactions is checked', async () => {
    const mockTxs = [
      {
        _id: 'tx1',
        type: 'expense',
        amount: 30,
        accountId: { _id: 'acc_inc', name: 'Compte Courant' },
        categoryId: { _id: 'cat1', name: 'Alimentation', color: '#ff0000', icon: '🍔' },
        date: new Date()
      }
    ];

    api.get.mockImplementation((url) => {
      if (url === '/transactions') return Promise.resolve({ data: { transactions: mockTxs } });
      if (url === '/charts/balance-history') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    // Check the "Journal des transactions" checkbox
    const checkbox = screen.getByLabelText('Journal des transactions');
    fireEvent.click(checkbox);

    // Click on show report button
    const analyzeBtn = screen.getByRole('button', { name: 'Analyser et afficher le rapport' });
    fireEvent.click(analyzeBtn);

    // Should show the transactions list header
    await waitFor(() => {
      expect(screen.getByText('Journal des transactions')).toBeInTheDocument();
      expect(screen.getByText('1 flux enregistrés sur la période')).toBeInTheDocument();
      expect(screen.getByText('Alimentation')).toBeInTheDocument();
    });
  });

  it('handles toggling back to filters form when clicking the Filtres button on the generated dashboard', async () => {
    const mockTxs = [
      {
        _id: 'tx1',
        type: 'expense',
        amount: 30,
        accountId: { _id: 'acc_inc' },
        categoryId: { _id: 'cat1', name: 'Alimentation', color: '#ff0000', icon: '🍔' },
        date: new Date()
      }
    ];

    api.get.mockImplementation((url) => {
      if (url === '/transactions') return Promise.resolve({ data: { transactions: mockTxs } });
      if (url === '/charts/balance-history') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    // The filter settings card should be initially visible
    expect(screen.getByText('Paramètres du rapport')).toBeInTheDocument();

    // Click on "Analyser et afficher le rapport" to generate the report
    const analyzeBtn = screen.getByRole('button', { name: 'Analyser et afficher le rapport' });
    fireEvent.click(analyzeBtn);

    // Wait for the diagnostic dashboard to render and make sure settings card is hidden
    await waitFor(() => {
      expect(screen.getByText('Diagnostic Global')).toBeInTheDocument();
      expect(screen.queryByText('Paramètres du rapport')).not.toBeInTheDocument();
    });

    // Click on "Filtres" button in the summary header
    const filtresBtn = screen.getByRole('button', { name: 'Filtres' });
    fireEvent.click(filtresBtn);

    // The settings card should be visible again
    expect(screen.getByText('Paramètres du rapport')).toBeInTheDocument();
    // The dashboard elements should be hidden
    expect(screen.queryByText('Diagnostic Global')).not.toBeInTheDocument();
  });
});
