import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useMonthlySummaries = (year) => {
  const [summaries, setSummaries] = useState([]);
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    // Set loading to true asynchronously on year change to avoid synchronous setState warnings in effects
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    api.get(`/dashboard/monthly-summaries?year=${year}`)
      .then(res => {
        if (active) {
          setSummaries(res.data.summaries || []);
          setAvailableYears(res.data.availableYears || [year]);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setError(err.response?.data?.message || 'Erreur lors du chargement des données');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [year]);

  const refreshHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/monthly-summaries?year=${year}`);
      setSummaries(res.data.summaries || []);
      setAvailableYears(res.data.availableYears || [year]);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [year]);

  return {
    summaries,
    availableYears,
    loading,
    error,
    refreshHistory
  };
};
