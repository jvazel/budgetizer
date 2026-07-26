import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginAttemptDocument extends Document {
  _id: mongoose.Types.ObjectId;
  identifier: string;
  ip: string;
  attempts: number;
  lockedUntil: Date | null;
  lastAttemptAt: Date;
  createdAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttemptDocument>(
  {
    identifier: {
      type: String,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true },
  }
);

LoginAttemptSchema.index({ identifier: 1, ip: 1 }, { unique: true });

const LoginAttempt = mongoose.models.LoginAttempt ||
  mongoose.model<ILoginAttemptDocument>('LoginAttempt', LoginAttemptSchema);

export default LoginAttempt;