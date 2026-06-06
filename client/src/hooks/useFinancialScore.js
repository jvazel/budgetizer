import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Hook to fetch the financial score for a specific month.
 * @param {string} monthKey - Format YYYY-MM
 */
export const useFinancialScore = (monthKey) => {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScore = useCallback(async () => {
    if (!monthKey) return;
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/score?monthKey=${monthKey}`);
      setScore(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Erreur lors du chargement du score');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return { score, loading, error, refresh: fetchScore };
};

/**
 * Hook to fetch the financial score history for a given year.
 * @param {number} year
 */
export const useFinancialScoreHistory = (year) => {
  const [scores, setScores] = useState([]);
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    api.get(`/dashboard/score-history?year=${year}`)
      .then(res => {
        if (active) {
          setScores(res.data.scores || []);
          setAvailableYears(res.data.availableYears || [year]);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setError(err.response?.data?.message || 'Erreur lors du chargement de l\'historique');
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
      const res = await api.get(`/dashboard/score-history?year=${year}`);
      setScores(res.data.scores || []);
      setAvailableYears(res.data.availableYears || [year]);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  }, [year]);

  return { scores, availableYears, loading, error, refreshHistory };
};
