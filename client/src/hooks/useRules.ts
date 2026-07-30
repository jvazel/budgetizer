import { useState, useEffect, useCallback } from 'react';
import { ICategorizationRule } from '@budgetizer/shared';
import * as ruleService from '../services/ruleService';
import toast from 'react-hot-toast';

export function useRules() {
  const [rules, setRules] = useState<ICategorizationRule[]>([]);
  const [suggestions, setSuggestions] = useState<ruleService.SuggestedRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ruleService.getRules();
      setRules(data);
    } catch (err) {
      console.error('Erreur chargement des règles:', err);
      toast.error('Erreur lors du chargement des règles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await ruleService.getSuggestedRules();
      setSuggestions(data);
    } catch (err) {
      console.error('Erreur chargement des suggestions:', err);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchSuggestions();
  }, [fetchRules, fetchSuggestions]);

  const addRule = async (data: ruleService.CreateRuleDTO) => {
    try {
      const res = await ruleService.createRule(data);
      setRules(prev => [...prev, res.rule].sort((a, b) => a.priority - b.priority));
      if (res.retroactivelyAppliedCount > 0) {
        toast.success(`Règle créée et appliquée à ${res.retroactivelyAppliedCount} transaction(s) passée(s)`);
      } else {
        toast.success('Règle créée avec succès');
      }
      fetchSuggestions();
      return res.rule;
    } catch (err) {
      console.error('Erreur création règle:', err);
      toast.error('Impossible de créer la règle');
      throw err;
    }
  };

  const editRule = async (id: string, data: Partial<ruleService.CreateRuleDTO>) => {
    try {
      const res = await ruleService.updateRule(id, data);
      setRules(prev => prev.map(r => r._id === id ? res.rule : r));
      if (res.retroactivelyAppliedCount > 0) {
        toast.success(`Règle mise à jour et appliquée à ${res.retroactivelyAppliedCount} transaction(s)`);
      } else {
        toast.success('Règle mise à jour');
      }
      return res.rule;
    } catch (err) {
      console.error('Erreur mise à jour règle:', err);
      toast.error('Impossible de modifier la règle');
      throw err;
    }
  };

  const removeRule = async (id: string) => {
    try {
      await ruleService.deleteRule(id);
      setRules(prev => prev.filter(r => r._id !== id));
      toast.success('Règle supprimée');
    } catch (err) {
      console.error('Erreur suppression règle:', err);
      toast.error('Impossible de supprimer la règle');
    }
  };

  const reorder = async (ruleIds: string[]) => {
    try {
      const updatedRules = await ruleService.reorderRules(ruleIds);
      setRules(updatedRules);
      toast.success('Ordre des priorités mis à jour');
    } catch (err) {
      console.error('Erreur réorganisation:', err);
      toast.error('Erreur lors de la réorganisation');
    }
  };

  return {
    rules,
    suggestions,
    isLoading,
    fetchRules,
    addRule,
    editRule,
    removeRule,
    reorder
  };
}
