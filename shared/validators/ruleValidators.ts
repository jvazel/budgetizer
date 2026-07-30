import { z } from 'zod';

export const ruleConditionSchema = z.object({
  field: z.enum(['description', 'amount', 'accountId', 'type']),
  operator: z.enum([
    'contains',
    'equals',
    'starts_with',
    'ends_with',
    'greater_than',
    'less_than',
    'regex'
  ]),
  value: z.union([z.string(), z.number()])
});

export const ruleActionSchema = z.object({
  categoryId: z.string().optional().nullable(),
  tagsToAdd: z.array(z.string()).optional(),
  autoReview: z.boolean().optional(),
  renameDescription: z.string().optional()
});

export const createRuleSchema = z.object({
  name: z.string().min(1, 'Le nom de la règle est requis').max(100),
  priority: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  matchLogic: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(ruleConditionSchema).min(1, 'Au moins une condition est requise'),
  actions: ruleActionSchema,
  applyRetroactively: z.boolean().optional()
});

export const updateRuleSchema = createRuleSchema.partial();

export const reorderRulesSchema = z.object({
  ruleIds: z.array(z.string()).min(1)
});

export const testRuleSchema = z.object({
  conditions: z.array(ruleConditionSchema).min(1),
  matchLogic: z.enum(['AND', 'OR']).default('AND'),
  sampleTransaction: z.object({
    description: z.string().optional(),
    amount: z.number().optional(),
    accountId: z.string().optional(),
    type: z.enum(['expense', 'income', 'transfer']).optional()
  })
});
