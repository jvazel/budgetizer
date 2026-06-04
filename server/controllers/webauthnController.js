import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import User from '../models/User.js';
import UserCredential from '../models/UserCredential.js';
import WebauthnChallenge from '../models/WebauthnChallenge.js';
import jwt from 'jsonwebtoken';

const rpName = 'Budgetizer';
const getRpID = () => {
  const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
  return rpID.trim();
};
const getOrigin = () => {
  const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';
  return origin.replace(/\/$/, '').trim();
};

// Helper to generate JWT (identical to authController.js)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// @desc    Generate WebAuthn registration options
// @route   GET /api/webauthn/register/options
// @access  Private
export const getRegistrationOptions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clean up corrupt credentials containing commas (legacy bug)
    await UserCredential.deleteMany({ userId: user._id, credentialID: { $regex: /,/ } });

    // Retrieve existing credentials to exclude them from registration
    const userCredentials = await UserCredential.find({ userId: user._id });
    const excludeCredentials = userCredentials.map(cred => ({
      id: cred.credentialID,
      type: 'public-key',
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpID(),
      userID: user._id.toString(),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });

    // Save challenge to temporary DB collection
    await WebauthnChallenge.create({
      challenge: options.challenge,
      userId: user._id
    });

    res.json(options);
  } catch (error) {
    console.error('Error generating registration options:', error);
    res.status(500).json({ message: 'Erreur lors de la génération des options biométriques.' });
  }
};

// @desc    Verify WebAuthn registration response
// @route   POST /api/webauthn/register/verify
// @access  Private
export const verifyRegistration = async (req, res) => {
  try {
    const { body } = req;
    const userId = req.user.id;

    // Find and delete the challenge
    const dbChallenge = await WebauthnChallenge.findOne({ userId });
    if (!dbChallenge) {
      return res.status(400).json({ message: 'Challenge de vérification expiré ou invalide.' });
    }
    const expectedChallenge = dbChallenge.challenge;
    await WebauthnChallenge.deleteOne({ _id: dbChallenge._id });

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: getOrigin(),
        expectedRPID: getRpID(),
        requireUserVerification: false,
      });
    } catch (err) {
      console.error('WebAuthn verification error:', err);
      return res.status(400).json({ message: 'Validation de la signature échouée.', error: err.message });
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo || !registrationInfo.credential) {
      return res.status(400).json({ message: 'Authentification biométrique invalide.' });
    }

    const { id, publicKey, counter, transports } = registrationInfo.credential;
    const credentialID = Buffer.from(id).toString('base64url');

    // Check if credential ID already exists in DB
    const existingCred = await UserCredential.findOne({ credentialID });
    if (existingCred) {
      return res.status(400).json({ message: 'Cet appareil est déjà enregistré.' });
    }

    // Save new credential to DB
    await UserCredential.create({
      userId,
      credentialID,
      publicKey: Buffer.from(publicKey),
      counter,
      deviceName: body.deviceName || req.body.deviceName || 'Appareil de confiance',
      transports: transports || body.response.transports || []
    });

    res.status(201).json({ verified: true });
  } catch (error) {
    console.error('Error verifying registration:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la validation du périphérique.' });
  }
};

// @desc    Generate WebAuthn authentication options (login)
// @route   POST /api/webauthn/login/options
// @access  Public
export const getAuthenticationOptions = async (req, res) => {
  try {
    const { email } = req.body;
    let allowCredentials = [];
    let userId = null;

    if (email) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        userId = user._id;
        // Clean up corrupt credentials containing commas (legacy bug)
        await UserCredential.deleteMany({ userId: user._id, credentialID: { $regex: /,/ } });
        const userCredentials = await UserCredential.find({ userId: user._id });
        allowCredentials = userCredentials.map(cred => ({
          id: cred.credentialID,
          type: 'public-key',
          transports: cred.transports,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpID(),
      allowCredentials,
      userVerification: 'preferred',
    });

    // Save challenge
    await WebauthnChallenge.create({
      challenge: options.challenge,
      userId
    });

    res.json(options);
  } catch (error) {
    console.error('Error generating authentication options:', error);
    res.status(500).json({ message: 'Erreur lors du démarrage de la connexion biométrique.' });
  }
};

// @desc    Verify WebAuthn authentication response (login verify)
// @route   POST /api/webauthn/login/verify
// @access  Public
export const verifyAuthentication = async (req, res) => {
  try {
    const { body, challenge } = req.body;

    if (!challenge) {
      return res.status(400).json({ message: 'Challenge requis pour la validation.' });
    }

    // Find and delete the challenge immediately
    const dbChallenge = await WebauthnChallenge.findOne({ challenge });
    if (!dbChallenge) {
      return res.status(400).json({ message: 'Le défi de sécurité a expiré ou a déjà été utilisé.' });
    }
    await WebauthnChallenge.deleteOne({ _id: dbChallenge._id });

    // Look up the credential in DB
    const credential = await UserCredential.findOne({ credentialID: body.id }).populate('userId');
    if (!credential) {
      return res.status(400).json({ message: 'Périphérique biométrique inconnu.' });
    }

    const user = credential.userId;
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur associé introuvable.' });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: challenge,
        expectedOrigin: getOrigin(),
        expectedRPID: getRpID(),
        authenticator: {
          credentialID: credential.credentialID,
          credentialPublicKey: credential.publicKey,
          counter: credential.counter,
          transports: credential.transports,
        },
        requireUserVerification: false,
      });
    } catch (err) {
      console.error('WebAuthn authentication verification error:', err);
      return res.status(400).json({ message: 'Échec de la validation biométrique.', error: err.message });
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return res.status(400).json({ message: 'Validation de la signature biométrique échouée.' });
    }

    // Update credential counter to prevent cloning
    credential.counter = authenticationInfo.newCounter;
    await credential.save();

    // Respond with user details & JWT token
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      preferences: user.preferences,
      currency: user.currency,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Error verifying authentication:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion biométrique.' });
  }
};

// @desc    Get user's registered WebAuthn credentials
// @route   GET /api/webauthn/credentials
// @access  Private
export const getCredentials = async (req, res) => {
  try {
    // Clean up corrupt credentials containing commas (legacy bug)
    await UserCredential.deleteMany({ userId: req.user.id, credentialID: { $regex: /,/ } });
    const credentials = await UserCredential.find({ userId: req.user.id })
      .select('deviceName transports createdAt')
      .sort({ createdAt: -1 });
    res.json(credentials);
  } catch (error) {
    console.error('Error getting credentials:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des appareils enregistrés.' });
  }
};

// @desc    Delete user's registered WebAuthn credential
// @route   DELETE /api/webauthn/credentials/:id
// @access  Private
export const deleteCredential = async (req, res) => {
  try {
    const credential = await UserCredential.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!credential) {
      return res.status(404).json({ message: 'Périphérique introuvable.' });
    }

    await UserCredential.deleteOne({ _id: credential._id });
    res.json({ message: 'Périphérique biométrique supprimé avec succès.' });
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'appareil.' });
  }
};
