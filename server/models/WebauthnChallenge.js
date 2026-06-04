import mongoose from 'mongoose';

const webauthnChallengeSchema = new mongoose.Schema({
  challenge: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Expiration après 5 minutes (300 secondes)
  }
});

// Index to query by challenge
webauthnChallengeSchema.index({ challenge: 1 });

export default mongoose.model('WebauthnChallenge', webauthnChallengeSchema);
