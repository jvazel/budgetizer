import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FloorBalanceWidget from '../FloorBalanceWidget';
import { AuthContext } from '../../../context/AuthContext';

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="recharts-area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null
}));

describe('FloorBalanceWidget Component', () => {
  const mockUser = {
    name: 'Johan V',
    currency: { symbol: '€', code: 'EUR' }
  };

  const mockUpcoming = [
    {
      _id: 'tx1',
      type: 'expense',
      amount: 150,
      description: 'Loyer',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      categoryId: { name: 'Logement', icon: '🏠', color: '#3b82f6' }
    },
    {
      _id: 'tx2',
      type: 'expense',
      amount: 50,
      description: 'Abonnement Netflix',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // In 5 days
      categoryId: { name: 'Loisirs', icon: '🎬', color: '#ef4444' }
    },
    {
      _id: 'tx3',
      type: 'income',
      amount: 2500,
      description: 'Salaire',
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // In 15 days (Paycheck)
      categoryId: { name: 'Revenus', icon: '💰', color: '#10b981' }
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <FloorBalanceWidget 
          actualBalance={1000} 
          upcoming={mockUpcoming} 
          loading={false} 
          {...props} 
        />
      </AuthContext.Provider>
    );
  };

  it('renders floor balance and actual balance correctly', () => {
    renderComponent();
    
    // Header labels check
    expect(screen.getByText('Solde disponible')).toBeInTheDocument();
    
    // Floor balance should be actualBalance (1000) - tx1 (150) - tx2 (50) = 800
    // Because paycheck is in 15 days, so tx1 & tx2 are within the window
    expect(screen.getByText(/800,00/)).toBeInTheDocument();
    
    // Actual balance subtext
    expect(screen.getByText(/1 000,00/)).toBeInTheDocument();
  });

  it('toggles settings dropdown and allows changing paycheck day', () => {
    renderComponent();
    
    // Open settings
    const settingsBtn = screen.getByRole('button', { name: /configurer le jour de paye/i });
    fireEvent.click(settingsBtn);
    
    // Selector should be visible
    const select = screen.getByLabelText(/jour récurrent de paye/i);
    expect(select).toBeInTheDocument();
    
    // Change paycheck day to the 10th
    fireEvent.change(select, { target: { value: '10' } });
    expect(localStorage.getItem('budgetizer_paycheck_day')).toBe('10');
  });

  it('toggles accordion and shows upcoming bills list', () => {
    renderComponent();
    
    // Accordion header
    const toggleButton = screen.getByRole('button', { name: /échéances avant la paye/i });
    
    // Initially not expanded (tx1 should not be in document as description)
    expect(screen.queryByText('Loyer')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(toggleButton);
    
    // Now details should be shown
    expect(screen.getByText('Loyer')).toBeInTheDocument();
    expect(screen.getByText('Abonnement Netflix')).toBeInTheDocument();
  });

  it('allows excluding an expense by clicking it, recalculating floor balance in real-time', () => {
    renderComponent();
    
    // Expand list
    const toggleButton = screen.getByRole('button', { name: /échéances avant la paye/i });
    fireEvent.click(toggleButton);
    
    // Loyer item row is clickable
    const loyerItem = screen.getByText('Loyer').closest('div[class*="cursor-pointer"]');
    expect(loyerItem).toBeInTheDocument();
    
    // Click to exclude it
    fireEvent.click(loyerItem);
    
    // Recalculates: Floor balance becomes 1000 - 50 = 950 (Loyer 150 is excluded)
    expect(screen.getByText(/950,00/)).toBeInTheDocument();
    
    // Check saved in localStorage
    const savedExclusions = JSON.parse(localStorage.getItem('budgetizer_excluded_floor_expenses'));
    expect(savedExclusions).toContain('tx1');
    
    // Click again to include it back
    fireEvent.click(loyerItem);
    expect(screen.getByText(/800,00/)).toBeInTheDocument();
  });
});
