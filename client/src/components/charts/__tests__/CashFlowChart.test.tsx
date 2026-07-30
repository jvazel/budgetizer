import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CashFlowChart from '../CashFlowChart';
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
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({ content }: any) => {
    if (React.isValidElement(content)) {
      return (
        <div data-testid="mock-tooltip">
          {React.cloneElement(content, {
            active: true,
            payload: [
              { name: 'income', value: 3000, color: '#10b981' },
              { name: 'expenses', value: 2000, color: '#f43f5e' }
            ],
            label: '2026-07'
          } as any)}
        </div>
      );
    }
    return null;
  },
  ReferenceLine: () => null,
  Legend: () => null,
  CartesianGrid: () => null
}));

describe('CashFlowChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      data: {
        history: [
          { month: '2026-07', income: 3000, expenses: 2000, net: 1000 }
        ],
        metrics: {
          status: 'healthy',
          avgIncome: 3000,
          avgExpenses: 2000,
          netRate: 33.3
        }
      }
    });
  });

  it('renders CashFlowChart and custom tooltip without scope errors', async () => {
    render(
      <MemoryRouter>
        <CashFlowChart />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-tooltip')).toBeInTheDocument();
  });
});
