import mongoose from 'mongoose';
import { IShareDocument, ShareModel } from './types';

const shareSchema = new mongoose.Schema({
  resourceType: {
    type: String,
    enum: ['account', 'budget'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'resourceModel'
  },
  resourceModel: {
    type: String,
    required: true,
    enum: ['Account', 'Budget']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWithId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permission: {
    type: String,
    enum: ['read', 'write'],
    default: 'read',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce unique share per resource and recipient
shareSchema.index({ resourceType: 1, resourceId: 1, sharedWithId: 1 }, { unique: true });
shareSchema.index({ sharedWithId: 1, resourceType: 1 });
shareSchema.index({ ownerId: 1 });

export default mongoose.model<IShareDocument, ShareModel>('Share', shareSchema);
