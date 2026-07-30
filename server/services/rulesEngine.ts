import mongoose from 'mongoose';
import CategorizationRule from '../models/CategorizationRule';
import Transaction from '../models/Transaction';
import { ICategorizationRuleDocument, IRuleConditionSubdocument } from '../models/types';

export interface ITransactionInputData {
  description?: string;
  amount?: number;
  accountId?: string;
  type?: 'expense' | 'income' | 'transfer';
  categoryId?: string | null;
  tags?: string[];
  isReviewed?: boolean;
}

export interface IRulesEngineResult {
  matchedRule: ICategorizationRuleDocument | null;
  categoryId?: string | null;
  tags?: string[];
  autoReviewed: boolean;
  renamedDescription?: string;
}

/**
 * Évalue une condition unique sur une transaction
 */
export function evaluateCondition(transaction: ITransactionInputData, condition: IRuleConditionSubdocument): boolean {
  const fieldValue = transaction[condition.field];

  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  // Évaluation numérique pour le montant
  if (condition.field === 'amount') {
    const numValue = Number(fieldValue);
    const targetNum = Number(condition.value);
    if (isNaN(numValue) || isNaN(targetNum)) return false;

    if (condition.operator === 'greater_than') return numValue > targetNum;
    if (condition.operator === 'less_than') return numValue < targetNum;
    if (condition.operator === 'equals') return numValue === targetNum;
    return false;
  }

  // Évaluation textuelle (insensible à la casse)
  const strValue = String(fieldValue).toLowerCase();
  const targetStr = String(condition.value).toLowerCase();

  switch (condition.operator) {
    case 'contains':
      return strValue.includes(targetStr);
    case 'equals':
      return strValue === targetStr;
    case 'starts_with':
      return strValue.startsWith(targetStr);
    case 'ends_with':
      return strValue.endsWith(targetStr);
    case 'regex':
      try {
        const regex = new RegExp(String(condition.value), 'i');
        return regex.test(strValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Évalue si l'ensemble des conditions d'une règle matche selon matchLogic ('AND' | 'OR')
 */
export function evaluateRule(transaction: ITransactionInputData, rule: ICategorizationRuleDocument): boolean {
  if (!rule.conditions || rule.conditions.length === 0) return false;

  if (rule.matchLogic === 'OR') {
    return rule.conditions.some(cond => evaluateCondition(transaction, cond));
  } else {
    // Par défaut 'AND'
    return rule.conditions.every(cond => evaluateCondition(transaction, cond));
  }
}

/**
 * Applique le moteur de règles sur une transaction pour un utilisateur donné
 */
export async function applyRulesToTransaction(
  userId: string,
  transactionInput: ITransactionInputData
): Promise<IRulesEngineResult> {
  let rules: ICategorizationRuleDocument[] = [];
  if (mongoose.Types.ObjectId.isValid(userId)) {
    rules = await CategorizationRule.find({
      userId,
      isActive: true
    }).sort({ priority: 1 });
  }

  for (const rule of rules) {
    if (evaluateRule(transactionInput, rule)) {
      // Mettre à jour le compteur d'utilisation de la règle
      rule.matchCount = (rule.matchCount || 0) + 1;
      rule.lastMatchedAt = new Date();
      await rule.save().catch(() => {});

      const result: IRulesEngineResult = {
        matchedRule: rule,
        categoryId: rule.actions.categoryId ? rule.actions.categoryId.toString() : transactionInput.categoryId,
        tags: transactionInput.tags || [],
        autoReviewed: !!rule.actions.autoReview,
        renamedDescription: rule.actions.renameDescription || undefined
      };

      if (rule.actions.tagsToAdd && rule.actions.tagsToAdd.length > 0) {
        const existingTags = new Set(result.tags || []);
        rule.actions.tagsToAdd.forEach(tagId => existingTags.add(tagId.toString()));
        result.tags = Array.from(existingTags);
      }

      return result;
    }
  }

  return {
    matchedRule: null,
    categoryId: transactionInput.categoryId,
    tags: transactionInput.tags,
    autoReviewed: false
  };
}

/**
 * Applique une règle rétroactivement sur les transactions d'un utilisateur
 */
export async function applyRuleRetroactively(userId: string, ruleId: string): Promise<number> {
  const rule = await CategorizationRule.findOne({ _id: ruleId, userId });
  if (!rule) return 0;

  const transactions = await Transaction.find({ userId });
  let updatedCount = 0;

  for (const tx of transactions) {
    const txInput: ITransactionInputData = {
      description: tx.description,
      amount: tx.amount,
      accountId: tx.accountId.toString(),
      type: tx.type,
      categoryId: tx.categoryId ? tx.categoryId.toString() : null,
      tags: tx.tags ? tx.tags.map(t => t.toString()) : []
    };

    if (evaluateRule(txInput, rule)) {
      let modified = false;

      if (rule.actions.categoryId) {
        tx.categoryId = rule.actions.categoryId;
        tx.categorizationSource = 'rule';
        modified = true;
      }

      if (rule.actions.tagsToAdd && rule.actions.tagsToAdd.length > 0) {
        const existingTags = new Set((tx.tags || []).map(t => t.toString()));
        rule.actions.tagsToAdd.forEach(tagId => existingTags.add(tagId.toString()));
        tx.tags = Array.from(existingTags) as any;
        modified = true;
      }

      if (rule.actions.autoReview) {
        tx.isReviewed = true;
        modified = true;
      }

      if (rule.actions.renameDescription) {
        tx.description = rule.actions.renameDescription;
        modified = true;
      }

      if (modified) {
        await tx.save();
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    rule.matchCount = (rule.matchCount || 0) + updatedCount;
    rule.lastMatchedAt = new Date();
    await rule.save();
  }

  return updatedCount;
}
