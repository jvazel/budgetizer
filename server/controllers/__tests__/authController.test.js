import { vi, describe, it, expect, beforeEach } from 'vitest';
import { registerUser, loginUser } from '../authController.js';
import User from '../../models/User.js';
import Category from '../../models/Category.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../../models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((data) => Promise.resolve({
      id: 'user_created_123',
      _id: 'user_created_123',
      name: data.name,
      email: data.email,
      preferences: { theme: 'dark' },
      currency: 'EUR'
    }))
  }
}));

vi.mock('../../models/Category.js', () => ({
  default: {
    insertMany: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    genSalt: vi.fn().mockResolvedValue('salt123'),
    hash: vi.fn().mockResolvedValue('hashedPassword123'),
    compare: vi.fn()
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked_jwt_token_123')
  }
}));

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'testsecret';

    req = {
      body: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('registerUser', () => {
    it('should register a new user, seed categories and return a JWT token', async () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      // Mock user not existing yet
      User.findOne.mockResolvedValue(null);

      await registerUser(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt123');
      expect(User.create).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword123'
      });
      
      // Default categories seeding check
      expect(Category.insertMany).toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        _id: 'user_created_123',
        name: 'John Doe',
        email: 'john@example.com',
        preferences: { theme: 'dark' },
        currency: 'EUR',
        token: 'mocked_jwt_token_123'
      });
    });

    it('should return 400 status if user already exists', async () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      // Mock user already existing
      User.findOne.mockResolvedValue({ id: 'existing_user_id' });

      await registerUser(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(User.create).not.toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
    });
  });

  describe('loginUser', () => {
    it('should authenticate user and return token when credentials match', async () => {
      req.body = {
        email: 'john@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user_created_123',
        _id: 'user_created_123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword123',
        preferences: { theme: 'dark' },
        currency: 'EUR'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true); // passwords match

      await loginUser(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      
      expect(res.json).toHaveBeenCalledWith({
        _id: 'user_created_123',
        name: 'John Doe',
        email: 'john@example.com',
        preferences: { theme: 'dark' },
        currency: 'EUR',
        token: 'mocked_jwt_token_123'
      });
    });

    it('should return 401 status when password does not match', async () => {
      req.body = {
        email: 'john@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 'user_created_123',
        password: 'hashedPassword123'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // wrong password

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 401 status when email is not registered', async () => {
      req.body = {
        email: 'notregistered@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null); // not found

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
  });
});
