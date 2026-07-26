/**
 * Interface for a Monthly Report
 */
export interface MonthlyReport {
  period: string;
  summary: {
    income: number;
    expense: number;
    net: number;
  };
  details?: {
    topCategories: { name: string; amount: number }[];
    topExpenses: { name: string; amount: number }[];
  };
  alerts?: string[];
}

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { MonthlyReport } from '../types/financial';

export const useMonthlyReport = (monthKey: string) => {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!monthKey) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<MonthlyReport>(`/monthly-reports/${monthKey}`);
      setReport(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erreur lors de la génération du rapport.');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    report,
    loading,
    error,
    refreshReport: fetchReport
  };
};
