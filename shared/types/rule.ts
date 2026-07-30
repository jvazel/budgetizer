export type ConditionField = 'description' | 'amount' | 'accountId' | 'type';

export type ConditionOperator =
  | 'contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'regex';

export interface IRuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number;
}

export interface IRuleAction {
  categoryId?: string;
  tagsToAdd?: string[];
  autoReview?: boolean;
  renameDescription?: string;
}

export interface ICategorizationRule {
  _id: string;
  userId: string;
  name: string;
  priority: number;
  isActive: boolean;
  matchLogic: 'AND' | 'OR';
  conditions: IRuleCondition[];
  actions: IRuleAction;
  matchCount: number;
  lastMatchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
