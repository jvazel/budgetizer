import { vi, describe, it, expect, beforeEach } from 'vitest';
import { protect, clearAuthCache } from '../authMiddleware.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';

vi.mock('../../models/User.js', () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn()
  }
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthCache();
    process.env.JWT_SECRET = 'testsecret';

    req = {
      headers: {},
      cookies: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };

    next = vi.fn();
  });

  it('should call next() if valid token is provided and user exists', async () => {
    req.headers.authorization = 'Bearer validtoken123';
    
    jwt.verify.mockReturnValue({ id: 'user_123' });
    
    const mockUser = { _id: 'user_123', name: 'John Doe' };
    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser)
    });

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken123', 'testsecret');
    expect(User.findById).toHaveBeenCalledWith('user_123');
    expect(req.user).toBe(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should call next() if valid token is provided in cookies and user exists', async () => {
    req.cookies.token = 'cookietoken123';
    
    jwt.verify.mockReturnValue({ id: 'user_123' });
    
    const mockUser = { _id: 'user_123', name: 'John Doe' };
    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser)
    });

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('cookietoken123', 'testsecret');
    expect(User.findById).toHaveBeenCalledWith('user_123');
    expect(req.user).toBe(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if authorization header is missing', async () => {
    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('no token') });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or verification throws', async () => {
    req.headers.authorization = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if user from decoded token does not exist', async () => {
    req.headers.authorization = 'Bearer validtoken123';
    jwt.verify.mockReturnValue({ id: 'user_deleted' });
    
    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null) // user deleted
    });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, user not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should use cached user on consecutive calls within TTL and not query the database', async () => {
    req.headers.authorization = 'Bearer validtoken123';
    jwt.verify.mockReturnValue({ id: 'user_123' });

    const mockUser = { _id: 'user_123', name: 'John Doe' };
    const selectSpy = vi.fn().mockResolvedValue(mockUser);
    User.findById.mockReturnValue({
      select: selectSpy
    });

    // First call: Should query database
    await protect(req, res, next);
    expect(User.findById).toHaveBeenCalledTimes(1);
    expect(req.user).toBe(mockUser);
    expect(next).toHaveBeenCalledTimes(1);

    // Reset mocks call counts for clean assertions (but keep the verification/mock implementations)
    vi.clearAllMocks();
    jwt.verify.mockReturnValue({ id: 'user_123' });
    User.findById.mockReturnValue({
      select: selectSpy
    });

    // Second call: Should use cache and NOT query the database
    await protect(req, res, next);
    expect(User.findById).not.toHaveBeenCalled();
    expect(req.user).toBe(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

