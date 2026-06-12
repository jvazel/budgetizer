import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';
import { AuthContext } from '../../context/AuthContext';

// Variables to control mocked hooks response
let mockSavingsGoals = [];
let mockSavingsLoading = false;

// Mock hooks
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [],
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn()
  })
}));

vi.mock('../../hooks/useDashboard', () => ({
  useDashboard: () => ({
    data: {
      totalAvailable: 1500,
      totalCredit: -300,
      accounts: [
        { _id: 'acc1', name: 'Compte Courant', balance: 1500, type: 'checking', currency: 'EUR' }
      ],
      month: { income: 2500, expenses: 1000, net: 1500 },
      lastMonth: { income: 2200, expenses: 900, net: 1300 },
      last7DaysExpenses: [],
      balanceHistory: [],
      expensesByCategory: [],
      recentTransactions: [],
      budgetAlerts: [],
      notifications: []
    },
    loading: false,
    refreshDashboard: vi.fn()
  })
}));

vi.mock('../../hooks/useBudgets', () => ({
  useBudgets: () => ({
    budgets: [],
    loading: false
  })
}));

vi.mock('../../hooks/useSavingsGoals', () => ({
  useSavingsGoals: () => ({
    savingsGoals: mockSavingsGoals,
    loading: mockSavingsLoading
  })
}));

vi.mock('../../hooks/useScheduled', () => ({
  useScheduled: () => ({
    upcoming: [
      { _id: 'tx1', type: 'expense', amount: 100, date: new Date() }
    ],
    loading: false
  })
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

vi.mock('../../components/layout/AppShell', () => ({
  default: ({ children }) => (
    <div data-testid="app-shell">
      {children}
    </div>
  ),
  HeaderTitle: ({ children }) => <h1>{children}</h1>,
  HeaderActions: ({ children }) => <div>{children}</div>,
  HeaderBackButton: () => <button>Back</button>
}));

vi.mock('../../components/accounts/AccountFormSheet', () => ({
  default: () => <div data-testid="account-form-sheet" />
}));

vi.mock('../../components/ui/InstallPromptBanner', () => ({
  default: () => <div data-testid="install-prompt-banner" />
}));

vi.mock('../../components/ui/FloorBalanceWidget', () => ({
  default: ({ actualBalance, upcoming, loading }) => (
    <div data-testid="floor-balance-widget">
      Floor Balance: {actualBalance} | Upcoming: {upcoming.length} | Loading: {String(loading)}
    </div>
  )
}));

describe('Home Page Dashboard - Savings Goals preview card', () => {
  const mockUser = {
    id: 'user_123',
    name: 'Johan V',
    currency: { code: 'EUR', symbol: '€' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSavingsGoals = [];
    mockSavingsLoading = false;
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders empty savings goals state correctly', () => {
    mockSavingsGoals = [];
    mockSavingsLoading = false;
    
    renderComponent();

    // Check title section
    expect(screen.getByText("Objectifs d'épargne")).toBeInTheDocument();
    // Check empty message
    expect(screen.getByText("Aucun objectif d'épargne défini.")).toBeInTheDocument();
    // Check call-to-action button
    expect(screen.getByRole('button', { name: "Créer mon premier objectif" })).toBeInTheDocument();
  });

  it('renders listed active savings goals correctly', () => {
    mockSavingsGoals = [
      {
        _id: 'goal1',
        name: 'Achat Voiture',
        targetAmount: 5555,
        currentAmount: 1111,
        icon: '🚗',
        color: '#ff0000',
        targetDate: '2026-12-31'
      },
      {
        _id: 'goal2',
        name: 'Voyage Japon',
        targetAmount: 3333,
        currentAmount: 2222,
        icon: '🍣',
        color: '#00ff00',
        targetDate: '2027-05-15'
      }
    ];
    mockSavingsLoading = false;

    renderComponent();

    // Expect the goal cards names to be rendered
    expect(screen.getByText('Achat Voiture')).toBeInTheDocument();
    expect(screen.getByText('Voyage Japon')).toBeInTheDocument();

    // Expect progression percentages to be rendered (1111 / 5555 = 20% and 2222 / 3333 = 67%)
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();

    // Check current amount formatted currency
    expect(screen.getByText(/1 111/)).toBeInTheDocument();
    expect(screen.getByText(/2 222/)).toBeInTheDocument();
    
    // Check target amount formatted currency
    expect(screen.getByText(/5 555/)).toBeInTheDocument();
    expect(screen.getByText(/3 333/)).toBeInTheDocument();
  });

  it('offers a direct redirection button to savings page', async () => {
    mockSavingsGoals = [];
    mockSavingsLoading = false;
    
    renderComponent();

    // The Gérer buttons should be visible
    const manageBtns = screen.getAllByRole('button', { name: /Gérer/ });
    expect(manageBtns.length).toBeGreaterThan(0);
  });

  it('renders the FloorBalanceWidget on the dashboard', () => {
    renderComponent();
    expect(screen.getByTestId('floor-balance-widget')).toBeInTheDocument();
    expect(screen.getByText(/Floor Balance: 1200/)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming: 1/)).toBeInTheDocument();
  });
});
