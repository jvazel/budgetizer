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
    expect(screen.getByText('Aucune donnée disponible pour générer le rapport.')).toBeInTheDocument();
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
});
