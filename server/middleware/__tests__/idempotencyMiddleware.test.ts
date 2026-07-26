import { describe, it, expect, beforeEach } from 'vitest';

// Mock Mongoose model methods — path relative to __tests__ directory
vi.mock('../../models/IdempotentRequest.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

// Mock the model import (needed so vitest resolves it)
import IdempotentRequest from '../../models/IdempotentRequest';
import idempotencyMiddleware from '../idempotencyMiddleware';

describe('Idempotency Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const capturedData = {};
    
    req = {
      headers: {},
      user: { id: 'user_test_123' },
      method: 'POST',
      originalUrl: '/api/transactions',
      body: { amount: 50, type: 'expense' },
    };

    res = {
      json: vi.fn((body) => { capturedData.jsonBody = body; return res; }),
      status: vi.fn(function(code) { capturedData.statusCode = code; return this; }),
      end: vi.fn(),
    };

    next = vi.fn();
  });

  describe('Without Idempotency-Key header', () => {
    it('should call next() and skip idempotency logic', async () => {
      await idempotencyMiddleware(req, res, next);

      expect(IdempotentRequest.findOne).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();
    });

    it('should work for GET requests without key', async () => {
      req.method = 'GET';
      delete req.headers['idempotency-key'];

      await idempotencyMiddleware(req, res, next);

      expect(IdempotentRequest.findOne).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('With cached result (key already processed)', () => {
    it('should return the cached response without calling next()', async () => {
      req.headers['idempotency-key'] = 'abc123def456';
      
      IdempotentRequest.findOne.mockResolvedValue({
        pending: false,
        statusCode: 201,
        result: JSON.stringify({ _id: 'tx_789', amount: 50 }),
      });

      await idempotencyMiddleware(req, res, next);

      expect(IdempotentRequest.findOne).toHaveBeenCalledWith({ 
        idempotencyKey: 'abc123def456' 
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: 'tx_789', amount: 50 });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return cached error responses (non-2xx)', async () => {
      req.headers['idempotency-key'] = 'error_key_1';
      
      IdempotentRequest.findOne.mockResolvedValue({
        pending: false,
        statusCode: 400,
        result: JSON.stringify({ message: 'Invalid amount' }),
      });

      await idempotencyMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid amount' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('With new key (first time)', () => {
    it('should insert a pending record and call next()', async () => {
      req.headers['idempotency-key'] = 'new_key_1';
      
      // First find returns null (no cached result)
      IdempotentRequest.findOne.mockResolvedValue(null);
      // Create succeeds
      IdempotentRequest.create.mockResolvedValue({ id: 'db_record_1' });

      await idempotencyMiddleware(req, res, next);

      expect(IdempotentRequest.findOne).toHaveBeenCalledWith({ 
        idempotencyKey: 'new_key_1' 
      });
      expect(IdempotentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'new_key_1',
          userId: 'user_test_123',
          method: 'POST',
          path: '/api/transactions',
          requestBody: '{"amount":50,"type":"expense"}',
          pending: true,
        })
      );
      expect(next).toHaveBeenCalledOnce();
    });

    it('should handle duplicate insert (unique key violation) and return cached result', async () => {
      req.headers['idempotency-key'] = 'dup_key_1';
      
      // First find: no cached result → we try to create
      IdempotentRequest.findOne.mockResolvedValueOnce(null);
      // Second find (after duplicate error): finds the one that was created by another thread
      IdempotentRequest.findOne.mockResolvedValueOnce({
        pending: false,
        statusCode: 201,
        result: JSON.stringify({ _id: 'tx_dup' }),
      });
      // Create fails with duplicate key error
      const mongoError = new Error('E11000 duplicate key error');
      mongoError.code = 11000;
      mongoError.name = 'MongoServerError';
      IdempotentRequest.create.mockRejectedValue(mongoError);

      await idempotencyMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: 'tx_dup' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should continue to handler if create fails with non-unique-key error', async () => {
      req.headers['idempotency-key'] = 'fail_key_1';
      
      IdempotentRequest.findOne.mockResolvedValue(null);
      const genericError = new Error('Connection timeout');
      IdempotentRequest.create.mockRejectedValue(genericError);

      await idempotencyMiddleware(req, res, next);

      // Should NOT return early — should continue to the handler as a fallback
      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('PUT and DELETE methods', () => {
    it('should apply idempotency for PUT requests with key', async () => {
      req.method = 'PUT';
      req.headers['idempotency-key'] = 'put_key_1';
      
      IdempotentRequest.findOne.mockResolvedValue(null);
      IdempotentRequest.create.mockResolvedValue({ id: 'db_put' });

      await idempotencyMiddleware(req, res, next);

      expect(IdempotentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT', pending: true })
      );
      expect(next).toHaveBeenCalledOnce();
    });

    it('should apply idempotency for DELETE requests with key', async () => {
      req.method = 'DELETE';
      req.headers['idempotency-key'] = 'del_key_1';
      
      IdempotentRequest.findOne.mockResolvedValue(null);
      IdempotentRequest.create.mockResolvedValue({ id: 'db_del' });

      await idempotencyMiddleware(req, res, next);

      expect(IdempotentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'DELETE', pending: true })
      );
      expect(next).toHaveBeenCalledOnce();
    });

    it('should NOT apply idempotency for GET requests even with key', async () => {
      req.method = 'GET';
      req.headers['idempotency-key'] = 'get_key_1';
      
      await idempotencyMiddleware(req, res, next);

      expect(IdempotentRequest.findOne).not.toHaveBeenCalled();
    });
  });
});
