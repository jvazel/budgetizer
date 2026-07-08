import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinancialScoresPage from '../FinancialScoresPage';
import { useFinancialScoreHistory } from '../../hooks/useFinancialScore';

vi.mock('../../hooks/useFinancialScore', () => ({
  useFinancialScoreHistory: vi.fn()
}));

vi.mock('../../components/layout/AppShell', () => ({
  HeaderTitle: ({ children }) => <h1>{children}</h1>,
  HeaderBackButton: () => <button>Back</button>
}));

describe('FinancialScoresPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockHistoryData = [
    {
      monthKey: '2026-07',
      score: 85,
      grade: 'A',
      pillars: {
        savingsRate: { score: 25, maxScore: 30, savingsRate: 20, income: 3000, expenses: 2400 },
        budgets: { score: 18, maxScore: 20, totalBudget: 500, totalOverrun: 0, applicable: true },
        fixedCharges: { score: 8, maxScore: 10, fixedCharges: 800, ratio: 26 },
        patrimony: { score: 15, maxScore: 20, patrimoineStart: 5000, patrimoineEnd: 6000 },
        cushion: { score: 12, maxScore: 20, fixedCharges: 800 }
      },
      savingsGoalsBonus: {
        status: 'ontrack',
        goals: []
      }
    }
  ];

  it('should render monthly score history lists', () => {
    useFinancialScoreHistory.mockReturnValue({
      scores: mockHistoryData,
      availableYears: ['2026'],
      loading: false,
      error: null,
      refreshHistory: vi.fn()
    });

    render(
      <MemoryRouter>
        <FinancialScoresPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Scores financiers').length).toBeGreaterThan(0);
    expect(screen.getByText('Juillet 2026')).toBeInTheDocument();
    expect(screen.getByText('Grade A')).toBeInTheDocument();
  });

  it('should allow expanding score card details to view pillars', () => {
    useFinancialScoreHistory.mockReturnValue({
      scores: mockHistoryData,
      availableYears: ['2026'],
      loading: false,
      error: null,
      refreshHistory: vi.fn()
    });

    render(
      <MemoryRouter>
        <FinancialScoresPage />
      </MemoryRouter>
    );

    // Initial state: detailed pillars shouldn't be fully visible
    expect(screen.queryByText("Taux d'épargne")).not.toBeInTheDocument();

    // Click on Card (specifically "Grade A" element which is inside the click target) to expand details
    const cardHeader = screen.getByText('Grade A');
    fireEvent.click(cardHeader);

    // After expand: pillars should be visible
    expect(screen.getByText("Taux d'épargne")).toBeInTheDocument();
    expect(screen.getByText('25 / 30')).toBeInTheDocument();
    expect(screen.getByText('Matelas de sécurité')).toBeInTheDocument();
  });
});
