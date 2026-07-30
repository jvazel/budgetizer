import api from './api';
import { ICategorizationRule, IRuleCondition, IRuleAction } from '@budgetizer/shared';

export interface CreateRuleDTO {
  name: string;
  priority?: number;
  isActive?: boolean;
  matchLogic?: 'AND' | 'OR';
  conditions: IRuleCondition[];
  actions: IRuleAction;
  applyRetroactively?: boolean;
}

export interface TestRuleDTO {
  conditions: IRuleCondition[];
  matchLogic?: 'AND' | 'OR';
  sampleTransaction: {
    description?: string;
    amount?: number;
    accountId?: string;
    type?: 'expense' | 'income' | 'transfer';
  };
}

export interface SuggestedRule {
  descriptionKeyword: string;
  categoryId: string;
  count: number;
}

export const getRules = async (): Promise<ICategorizationRule[]> => {
  const response = await api.get('/rules');
  return response.data;
};

export const createRule = async (data: CreateRuleDTO): Promise<{ rule: ICategorizationRule; retroactivelyAppliedCount: number }> => {
  const response = await api.post('/rules', data);
  return response.data;
};

export const updateRule = async (id: string, data: Partial<CreateRuleDTO>): Promise<{ rule: ICategorizationRule; retroactivelyAppliedCount: number }> => {
  const response = await api.put(`/rules/${id}`, data);
  return response.data;
};

export const deleteRule = async (id: string): Promise<void> => {
  await api.delete(`/rules/${id}`);
};

export const reorderRules = async (ruleIds: string[]): Promise<ICategorizationRule[]> => {
  const response = await api.put('/rules/reorder', { ruleIds });
  return response.data;
};

export const testRule = async (data: TestRuleDTO): Promise<{ isMatch: boolean }> => {
  const response = await api.post('/rules/test', data);
  return response.data;
};

export const getSuggestedRules = async (): Promise<SuggestedRule[]> => {
  const response = await api.get('/rules/suggestions');
  return response.data;
};

export const reviewTransaction = async (transactionId: string, isReviewed?: boolean): Promise<{ message: string; isReviewed: boolean }> => {
  const response = await api.patch(`/transactions/${transactionId}/review`, { isReviewed });
  return response.data;
};
