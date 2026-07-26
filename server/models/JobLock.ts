import mongoose from 'mongoose';
import { IJobLockDocument, JobLockModel } from './types';

const jobLockSchema = new mongoose.Schema({
  lockName: {
    type: String,
    required: true,
    unique: true
  },
  holderId: {
    type: String,
    required: true
  },
  acquiredAt: {
    type: Date,
    default: Date.now
  }
});

jobLockSchema.index({ lockName: 1 }, { unique: true });
jobLockSchema.index({ acquiredAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.model<IJobLockDocument, JobLockModel>('JobLock', jobLockSchema);
