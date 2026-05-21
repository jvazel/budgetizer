import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useScheduled = () => {
  const [scheduled, setScheduled] = useState([]);
  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScheduledData = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, pRes, uRes] = await Promise.all([
        api.get('/scheduled'),
        api.get('/scheduled/pending'),
        api.get('/scheduled/upcoming?days=30')
      ]);
      setScheduled(sRes.data);
      setPending(pRes.data);
      setUpcoming(uRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching scheduled transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduledData();

    // Listen to transaction changes to update pending counts or lists
    const handleRefresh = () => fetchScheduledData();
    window.addEventListener('transaction-changed', handleRefresh);
    return () => window.removeEventListener('transaction-changed', handleRefresh);
  }, [fetchScheduledData]);

  const addScheduled = async (data) => {
    try {
      const res = await api.post('/scheduled', data);
      toast.success('Planification créée');
      fetchScheduledData();
      window.dispatchEvent(new CustomEvent('transaction-changed'));
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
      throw err;
    }
  };

  const updateScheduled = async (id, data) => {
    try {
      const res = await api.put(`/scheduled/${id}`, data);
      toast.success('Planification modifiée');
      fetchScheduledData();
      window.dispatchEvent(new CustomEvent('transaction-changed'));
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification');
      throw err;
    }
  };

  const deleteScheduled = async (id) => {
    try {
      await api.delete(`/scheduled/${id}`);
      toast.success('Planification supprimée');
      fetchScheduledData();
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
      throw err;
    }
  };

  const confirmPending = async (id, customAmount) => {
    try {
      await api.post(`/scheduled/${id}/confirm`, { amount: customAmount });
      toast.success('Transaction confirmée et enregistrée !');
      fetchScheduledData();
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de confirmation');
      throw err;
    }
  };

  const skipPending = async (id) => {
    try {
      await api.post(`/scheduled/${id}/skip`);
      toast.success('Échéance ignorée');
      fetchScheduledData();
      window.dispatchEvent(new CustomEvent('transaction-changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du saut');
      throw err;
    }
  };

  return {
    scheduled,
    pending,
    upcoming,
    loading,
    error,
    refreshScheduled: fetchScheduledData,
    addScheduled,
    updateScheduled,
    deleteScheduled,
    confirmPending,
    skipPending
  };
};
