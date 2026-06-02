import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useMonthlyReport = (monthKey) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    if (!monthKey) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/monthly-reports/${monthKey}`);
      setReport(response.data);
    } catch (err) {
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
