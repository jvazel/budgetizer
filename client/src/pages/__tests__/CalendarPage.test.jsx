import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CalendarPage from '../CalendarPage';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn() })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() }))
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../components/layout/AppShell', () => ({
  HeaderTitle: ({ children }) => <h1>{children}</h1>,
  HeaderActions: ({ children }) => <div data-testid="header-actions">{children}</div>,
  HeaderBackButton: () => <button>Back</button>
}));

vi.mock('../../components/transactions/TransactionFormSheet', () => ({
  default: () => <div data-testid="transaction-form-sheet">Transaction Form</div>
}));

vi.mock('../../components/calendar/MiniCalendar', () => ({
  default: ({ selectedDate, onSelectDate, transactions }) => (
    <div data-testid="mini-calendar">
      MiniCalendar Selected: {selectedDate.toDateString()}
      <button onClick={() => onSelectDate(new Date(2026, 6, 15))}>Select July 15</button>
    </div>
  )
}));

describe('CalendarPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTransactions = [
    {
      _id: 'tx1',
      description: 'Courses',
      amount: 50,
      type: 'expense',
      date: '2026-07-15T12:00:00.000Z',
      accountId: 'acc1',
      accountName: 'checking'
    }
  ];

  it('should render calendar and page elements', () => {
    useQuery.mockReturnValue({
      data: mockTransactions,
      isLoading: false
    });

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Calendrier').length).toBeGreaterThan(0);
    expect(screen.getByTestId('mini-calendar')).toBeInTheDocument();
  });

  it('should display transactions of the selected date', () => {
    useQuery.mockReturnValue({
      data: mockTransactions,
      isLoading: false
    });

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    );

    // Select July 15
    fireEvent.click(screen.getByText('Select July 15'));

    // Check that transaction is rendered
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('-50,00 €')).toBeInTheDocument();
  });
});
