import mongoose from 'mongoose';
import { IIdempotentRequestDocument, IdempotentRequestModel } from './types';

const idempotentRequestSchema = new mongoose.Schema({
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  method: {
    type: String,
  },
  path: {
    type: String,
  },
  requestBody: {
    type: String, // JSON stringified
  },
  pending: {
    type: Boolean,
    default: true,
  },
  statusCode: {
    type: Number,
  },
  result: {
    type: String, // JSON stringified response body
  },
  responseSentAt: {
    type: Date,
  },
}, { timestamps: true });

// Index pour le nettoyage des requêtes pending expirées (> 1h)
idempotentRequestSchema.index({ pending: 1, createdAt: -1 });

export default mongoose.model<IIdempotentRequestDocument, IdempotentRequestModel>('IdempotentRequest', idempotentRequestSchema);
