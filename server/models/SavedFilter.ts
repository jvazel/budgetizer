import mongoose from 'mongoose';
import { ISavedFilterDocument, SavedFilterModel } from './types';

const savedFilterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  filters: {
    search: { type: String, default: '' },
    accountId: { type: String, default: '' },
    categoryId: { type: String, default: '' },
    type: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Optimization for user query indexing
savedFilterSchema.index({ userId: 1 });

export default mongoose.model<ISavedFilterDocument, SavedFilterModel>('SavedFilter', savedFilterSchema);
