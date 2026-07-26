/**
 * Interface for Financial Score data
 */
export interface FinancialScoreData {
  score: number;
  alerts: string[];
  // Add other fields as needed based on API response
}

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useFinancialScore = (monthKey: string) => {
  const [score, setScore] = useState<FinancialScoreData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!monthKey) return;
    try {
      setLoading(true);
      const res = await api.get<FinancialScoreData>(`/dashboard/score?monthKey=${monthKey}`);
      setScore(res.data);
      setError(null);
    } catch (err: any) {
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

export const useFinancialScoreHistory = (year: number) => {
  const [scores, setScores] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  }, [year]);

  return { scores, availableYears, loading, error, refreshHistory };
};
