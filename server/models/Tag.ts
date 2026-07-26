import mongoose from 'mongoose';
import { ITagDocument, TagModel } from './types';

const tagSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: '#3B82F6'
  },
  isArchived: {
    type: Boolean,
    required: true,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce unique tag names per user
tagSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<ITagDocument, TagModel>('Tag', tagSchema);
