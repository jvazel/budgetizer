import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import requestIdMiddleware from '../requestIdMiddleware';

const app = express();
app.use(requestIdMiddleware);
app.get('/test-id', (req, res) => {
  res.json({ ok: true });
});

describe('requestIdMiddleware Unit Tests', () => {
  it('should attach X-Request-ID header to response when none is provided in request', async () => {
    const res = await request(app).get('/test-id');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('should reuse provided X-Request-ID header from request', async () => {
    const customId = 'custom-request-id-12345';
    const res = await request(app).get('/test-id').set('X-Request-ID', customId);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
  });
});
