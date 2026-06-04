import mongoose from 'mongoose';

const userCredentialSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  credentialID: {
    type: String,
    required: true,
    unique: true
  },
  publicKey: {
    type: Buffer,
    required: true
  },
  counter: {
    type: Number,
    required: true,
    default: 0
  },
  deviceName: {
    type: String,
    default: 'Appareil inconnu'
  },
  transports: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to query by userId
userCredentialSchema.index({ userId: 1 });

export default mongoose.model('UserCredential', userCredentialSchema);
