import mongoose, { Schema } from 'mongoose';
import { ICategorizationRuleDocument, CategorizationRuleModel } from './types';

const conditionSchema = new Schema({
  field: {
    type: String,
    enum: ['description', 'amount', 'accountId', 'type'],
    required: true
  },
  operator: {
    type: String,
    enum: ['contains', 'equals', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'regex'],
    required: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  }
}, { _id: false });

const actionSchema = new Schema({
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  tagsToAdd: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  autoReview: {
    type: Boolean,
    default: false
  },
  renameDescription: {
    type: String,
    default: null
  }
}, { _id: false });

const categorizationRuleSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: Number,
    required: true,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  matchLogic: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },
  conditions: [conditionSchema],
  actions: actionSchema,
  matchCount: {
    type: Number,
    default: 0
  },
  lastMatchedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

categorizationRuleSchema.index({ userId: 1, priority: 1 });
categorizationRuleSchema.index({ userId: 1, isActive: 1, priority: 1 });

export default mongoose.model<ICategorizationRuleDocument, CategorizationRuleModel>('CategorizationRule', categorizationRuleSchema);
