import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRoutes from '../routes/authRoutes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Routes Unit Tests', () => {
  it('should return 400 when registering with invalid email or missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 when logging in with missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: '',
        password: '',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 when requesting password reset without email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});
