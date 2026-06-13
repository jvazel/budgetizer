import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MonthlyReportPage from '../MonthlyReportPage';
import { AuthContext } from '../../context/AuthContext';
import * as summariesHook from '../../hooks/useMonthlySummaries';
import * as reportHook from '../../hooks/useMonthlyReport';

vi.mock('../../hooks/useMonthlySummaries');
vi.mock('../../hooks/useMonthlyReport');
vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [],
    totalBalance: 0,
    loading: false,
    error: null,
    fetchAccounts: vi.fn(),
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn()
  })
}));
vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: [],
    loading: false,
    error: null,
    fetchTransactions: vi.fn(),
    addTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn()
  })
}));

describe('MonthlyReportPage Component - Robustness Tests', () => {
  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: { id: 'user123', currency: { code: 'EUR' } } }}>
        <MemoryRouter>
          <MonthlyReportPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('handles loading state correctly without crashing', () => {
    vi.spyOn(summariesHook, 'useMonthlySummaries').mockReturnValue({
      summaries: [],
      availableYears: [2026],
      loading: true,
      error: null
    });

    vi.spyOn(reportHook, 'useMonthlyReport').mockReturnValue({
      report: null,
      loading: true,
      error: null,
      refreshReport: vi.fn()
    });

    renderComponent();
    expect(screen.getByText('Analyse en cours...')).toBeInTheDocument();
  });

  it('handles error state correctly without crashing', () => {
    vi.spyOn(summariesHook, 'useMonthlySummaries').mockReturnValue({
      summaries: [],
      availableYears: [2026],
      loading: false,
      error: null
    });

    vi.spyOn(reportHook, 'useMonthlyReport').mockReturnValue({
      report: null,
      loading: false,
      error: 'Failed to fetch report from server',
      refreshReport: vi.fn()
    });

    renderComponent();
    expect(screen.getByText('Erreur de chargement')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch report from server')).toBeInTheDocument();
  });

  it('handles null report correctly without crashing', () => {
    vi.spyOn(summariesHook, 'useMonthlySummaries').mockReturnValue({
      summaries: [],
      availableYears: [2026],
      loading: false,
      error: null
    });

    vi.spyOn(reportHook, 'useMonthlyReport').mockReturnValue({
      report: null,
      loading: false,
      error: null,
      refreshReport: vi.fn()
    });

    renderComponent();
    expect(screen.getByText('Aucune donnée disponible pour générer le rapport de cette période.')).toBeInTheDocument();
  });

  it('handles zero transactions state correctly by showing Données insuffisantes', () => {
    vi.spyOn(summariesHook, 'useMonthlySummaries').mockReturnValue({
      summaries: [],
      availableYears: [2026],
      loading: false,
      error: null
    });

    vi.spyOn(reportHook, 'useMonthlyReport').mockReturnValue({
      report: {
        reportText: 'P1\n\nP2\n\nP3',
        financialStats: { income: 0, expenses: 0, net: 0, savingsRate: 0 },
        isProvisional: true
      },
      loading: false,
      error: null,
      refreshReport: vi.fn()
    });

    renderComponent();
    expect(screen.getByText('Données insuffisantes')).toBeInTheDocument();
    expect(screen.getByText(/Il n'y a pas assez de transactions/)).toBeInTheDocument();
  });

  it('handles missing financialStats property in report without crashing', () => {
    vi.spyOn(summariesHook, 'useMonthlySummaries').mockReturnValue({
      summaries: [],
      availableYears: [2026],
      loading: false,
      error: null
    });

    vi.spyOn(reportHook, 'useMonthlyReport').mockReturnValue({
      report: {
        reportText: 'P1\n\nP2\n\nP3',
        isProvisional: true
      },
      loading: false,
      error: null,
      refreshReport: vi.fn()
    });

    renderComponent();
    expect(screen.getByText('Données insuffisantes')).toBeInTheDocument();
  });

  it('renders unusual transactions list when present in report data', () => {
    vi.spyOn(summariesHook, 'useMonthlySummaries').mockReturnValue({
      summaries: [],
      availableYears: [2026],
      loading: false,
      error: null
    });

    vi.spyOn(reportHook, 'useMonthlyReport').mockReturnValue({
      report: {
        reportText: 'P1\n\nP2\n\nP3',
        financialStats: { income: 2000, expenses: 1000, net: 1000, savingsRate: 50 },
        unusualTransactions: [
          {
            transactionId: 'unusual_1',
            description: 'Vols Paris-Tokyo',
            amount: 850,
            date: new Date(Date.UTC(2026, 4, 10)),
            categoryName: 'Voyages',
            ratio: 4.5
          },
          {
            transactionId: 'unusual_2',
            description: '',
            amount: 150,
            date: new Date(Date.UTC(2026, 4, 12)),
            categoryName: 'Alimentation',
            ratio: 3.2
          },
          {
            transactionId: 'unusual_3',
            description: '',
            note: 'Courses Carrefour',
            amount: 75,
            date: new Date(Date.UTC(2026, 4, 14)),
            categoryName: 'Alimentation',
            ratio: 3.5
          }
        ],
        isProvisional: false
      },
      loading: false,
      error: null,
      refreshReport: vi.fn()
    });

    renderComponent();
    expect(screen.getByText('Dépenses inhabituelles détectées')).toBeInTheDocument();
    expect(screen.getByText('Vols Paris-Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Sans description')).toBeInTheDocument();
    expect(screen.getByText('Courses Carrefour')).toBeInTheDocument();
    expect(screen.getByText('Voyages')).toBeInTheDocument();
    expect(screen.getAllByText('Alimentation').length).toBe(2);
    expect(screen.getByText(/850/)).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
    expect(screen.getByText('4.5x la moyenne')).toBeInTheDocument();
    expect(screen.getByText('3.2x la moyenne')).toBeInTheDocument();
    expect(screen.getByText('3.5x la moyenne')).toBeInTheDocument();
  });
});
