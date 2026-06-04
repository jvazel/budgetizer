import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getCredentials,
  deleteCredential
} from '../webauthnController.js';
import User from '../../models/User.js';
import UserCredential from '../../models/UserCredential.js';
import WebauthnChallenge from '../../models/WebauthnChallenge.js';

// Mock Models
vi.mock('../../models/User.js', () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn()
  }
}));

vi.mock('../../models/UserCredential.js', () => {
  const MockUserCredential = vi.fn().mockImplementation(function(data) {
    return { ...data, save: vi.fn().mockResolvedValue(this) };
  });
  MockUserCredential.find = vi.fn();
  MockUserCredential.findOne = vi.fn();
  MockUserCredential.create = vi.fn();
  MockUserCredential.deleteOne = vi.fn();
  MockUserCredential.deleteMany = vi.fn();
  return { default: MockUserCredential };
});

vi.mock('../../models/WebauthnChallenge.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn()
  }
}));

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'mockChallengeBase64',
    rp: { name: 'Budgetizer', id: 'localhost' },
    user: { id: 'userIdString', name: 'user@test.com', displayName: 'Test User' },
    excludeCredentials: [],
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
  }),
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        id: Buffer.from('mockCredId', 'base64url'),
        publicKey: Buffer.from('mockPublicKey'),
        counter: 0,
        transports: []
      }
    }
  }),
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: 'mockAuthChallengeBase64',
    allowCredentials: []
  }),
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: {
      newCounter: 1
    }
  })
}));

describe('WebAuthn Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: { id: 'user123' },
      body: {},
      params: {}
    };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe('getRegistrationOptions', () => {
    it('should generate options and save challenge to DB', async () => {
      const mockUser = { _id: 'user123', email: 'user@test.com', name: 'Test User' };
      User.findById.mockResolvedValue(mockUser);
      UserCredential.find.mockResolvedValue([]);

      await getRegistrationOptions(req, res);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(WebauthnChallenge.create).toHaveBeenCalledWith({
        challenge: 'mockChallengeBase64',
        userId: 'user123'
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        challenge: 'mockChallengeBase64'
      }));
    });

    it('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await getRegistrationOptions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('verifyRegistration', () => {
    it('should return 400 if challenge is missing or expired', async () => {
      WebauthnChallenge.findOne.mockResolvedValue(null);

      await verifyRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Challenge de vérification expiré ou invalide.' });
    });

    it('should verify response, delete challenge, and save credential in DB', async () => {
      WebauthnChallenge.findOne.mockResolvedValue({ _id: 'chal123', challenge: 'mockChallengeBase64' });
      UserCredential.findOne.mockResolvedValue(null);

      req.body = {
        id: 'mockCredId',
        rawId: 'mockRawId',
        type: 'public-key',
        response: {
          clientDataJSON: 'mockClientData',
          attestationObject: 'mockAttestation'
        },
        deviceName: 'MacBook'
      };

      await verifyRegistration(req, res);

      expect(WebauthnChallenge.deleteOne).toHaveBeenCalledWith({ _id: 'chal123' });
      expect(UserCredential.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        credentialID: 'mockCredIQ',
        deviceName: 'MacBook'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ verified: true });
    });
  });

  describe('getAuthenticationOptions', () => {
    it('should generate auth options and save challenge to DB', async () => {
      await getAuthenticationOptions(req, res);

      expect(WebauthnChallenge.create).toHaveBeenCalledWith(expect.objectContaining({
        challenge: 'mockAuthChallengeBase64'
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        challenge: 'mockAuthChallengeBase64'
      }));
    });

    it('should retrieve registered credentials if email is provided', async () => {
      req.body = { email: 'user@test.com' };
      User.findOne.mockResolvedValue({ _id: 'user123', email: 'user@test.com' });
      UserCredential.find.mockResolvedValue([
        { credentialID: 'cred1', transports: ['usb'] }
      ]);

      await getAuthenticationOptions(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@test.com' });
      expect(UserCredential.find).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });

  describe('verifyAuthentication', () => {
    it('should return 400 if challenge is missing', async () => {
      req.body = { body: {} };

      await verifyAuthentication(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Challenge requis pour la validation.' });
    });

    it('should verify signature and return JWT token on success', async () => {
      req.body = {
        challenge: 'mockAuthChallengeBase64',
        body: { id: 'mockCredId' }
      };

      WebauthnChallenge.findOne.mockResolvedValue({ _id: 'chal456', challenge: 'mockAuthChallengeBase64' });
      const mockCred = {
        credentialID: 'mockCredId',
        publicKey: Buffer.from('mockPublicKey'),
        counter: 0,
        userId: { _id: 'user123', name: 'Test User', email: 'user@test.com', preferences: {}, currency: {} },
        save: vi.fn().mockResolvedValue(true)
      };
      UserCredential.findOne.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockCred)
      });

      process.env.JWT_SECRET = 'testsecret';

      await verifyAuthentication(req, res);

      expect(WebauthnChallenge.deleteOne).toHaveBeenCalledWith({ _id: 'chal456' });
      expect(mockCred.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        _id: 'user123',
        token: expect.any(String)
      }));
    });
  });

  describe('getCredentials', () => {
    it('should return user credentials sorted by createdAt', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue([{ deviceName: 'MacBook' }])
      };
      UserCredential.find.mockReturnValue(mockQuery);

      await getCredentials(req, res);

      expect(UserCredential.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(res.json).toHaveBeenCalledWith([{ deviceName: 'MacBook' }]);
    });
  });

  describe('deleteCredential', () => {
    it('should delete specified credential', async () => {
      req.params.id = 'cred123';
      UserCredential.findOne.mockResolvedValue({ _id: 'cred123', userId: 'user123' });

      await deleteCredential(req, res);

      expect(UserCredential.findOne).toHaveBeenCalledWith({ _id: 'cred123', userId: 'user123' });
      expect(UserCredential.deleteOne).toHaveBeenCalledWith({ _id: 'cred123' });
      expect(res.json).toHaveBeenCalledWith({ message: 'Périphérique biométrique supprimé avec succès.' });
    });

    it('should return 404 if credential not found or not owned by user', async () => {
      req.params.id = 'cred123';
      UserCredential.findOne.mockResolvedValue(null);

      await deleteCredential(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Périphérique introuvable.' });
    });
  });
});
