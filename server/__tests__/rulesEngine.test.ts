import { describe, it, expect } from 'vitest';
import { evaluateCondition, evaluateRule, ITransactionInputData } from '../services/rulesEngine';

describe('Smart Rules Engine Tests', () => {
  const sampleTransaction: ITransactionInputData = {
    description: 'CARREFOUR EXPRESS PARIS 15',
    amount: 45.50,
    accountId: 'acc123',
    type: 'expense'
  };

  describe('evaluateCondition', () => {
    it('should match contains operator case-insensitively', () => {
      const condition = { field: 'description' as const, operator: 'contains' as const, value: 'carrefour' };
      expect(evaluateCondition(sampleTransaction, condition)).toBe(true);
    });

    it('should match starts_with operator', () => {
      const condition = { field: 'description' as const, operator: 'starts_with' as const, value: 'CARREFOUR' };
      expect(evaluateCondition(sampleTransaction, condition)).toBe(true);
    });

    it('should match greater_than operator for amount', () => {
      const condition = { field: 'amount' as const, operator: 'greater_than' as const, value: 40 };
      expect(evaluateCondition(sampleTransaction, condition)).toBe(true);
      
      const falseCond = { field: 'amount' as const, operator: 'greater_than' as const, value: 50 };
      expect(evaluateCondition(sampleTransaction, falseCond)).toBe(false);
    });

    it('should match regex operator', () => {
      const condition = { field: 'description' as const, operator: 'regex' as const, value: 'carrefour.*paris' };
      expect(evaluateCondition(sampleTransaction, condition)).toBe(true);
    });
  });

  describe('evaluateRule', () => {
    it('should match with AND logic when all conditions pass', () => {
      const mockRule = {
        conditions: [
          { field: 'description' as const, operator: 'contains' as const, value: 'carrefour' },
          { field: 'amount' as const, operator: 'less_than' as const, value: 100 }
        ],
        matchLogic: 'AND' as const
      } as any;

      expect(evaluateRule(sampleTransaction, mockRule)).toBe(true);
    });

    it('should fail AND logic when one condition fails', () => {
      const mockRule = {
        conditions: [
          { field: 'description' as const, operator: 'contains' as const, value: 'carrefour' },
          { field: 'amount' as const, operator: 'greater_than' as const, value: 100 }
        ],
        matchLogic: 'AND' as const
      } as any;

      expect(evaluateRule(sampleTransaction, mockRule)).toBe(false);
    });

    it('should match OR logic when at least one condition passes', () => {
      const mockRule = {
        conditions: [
          { field: 'description' as const, operator: 'contains' as const, value: 'auchan' },
          { field: 'description' as const, operator: 'contains' as const, value: 'carrefour' }
        ],
        matchLogic: 'OR' as const
      } as any;

      expect(evaluateRule(sampleTransaction, mockRule)).toBe(true);
    });
  });
});
