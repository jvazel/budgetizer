import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeAll } from 'vitest';
import swaggerSpec from '../utils/swagger';
import swaggerUi from 'swagger-ui-express';

// --- Helpers -----------------------------------------------------------------

async function createTestApp() {
  const app = express();
  const helmet = (await import('helmet')).default;
  const mongoSanitize = (await import('express-mongo-sanitize')).default;
  const cookieParser = (await import('cookie-parser')).default;

  app.set('trust proxy', 1);

  // Dynamic CORS — extrait de index.js
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (
      origin &&
      (allowedOrigins.includes(origin) ||
        (isDevelopment &&
          (origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:'))))
    ) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');
      res.header('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  app.use((req, _res, next) => {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  });

  app.use(express.json());

  // Security (dev mode — same as index.js)
  app.use(
    helmet({
      hsts: false,
      crossOriginEmbedderPolicy: false,
      crossOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );
  app.use(mongoSanitize());

  app.use(cookieParser());

  return app;
}

// --- Test: Middleware & Security ---------------------------------------------

describe('API Contract — Middleware & Security', () => {
  let testApp;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    testApp = await createTestApp();

    // Dummy endpoint to exercise the middleware chain
    testApp.post('/api/contract-test', (req, res) => {
      res.json({ ok: true, received: req.body });
    });

    // Swagger docs route
    testApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {}));
  });

  describe('CORS Headers', () => {
    it('should set CORS headers for localhost origin in development', async () => {
      const res = await request(testApp)
        .get('/api/contract-test')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
    });

    it('should set CORS headers for 127.0.0.1 origin in development', async () => {
      const res = await request(testApp)
        .get('/api/contract-test')
        .set('Origin', 'http://127.0.0.1:3000');

      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });

    it('should NOT set CORS headers for unallowed origin in production', async () => {
      process.env.NODE_ENV = 'production';
      const prodApp = await createTestApp();
      prodApp.get('/api/contract-test', (_req, res) => res.json({ ok: true }));

      const res = await request(prodApp)
        .get('/api/contract-test')
        .set('Origin', 'https://evil-site.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();

      process.env.NODE_ENV = 'test';
    });

    it('should respond 200 to OPTIONS preflight', async () => {
      const res = await request(testApp)
        .options('/api/contract-test')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
    });
  });

  describe('CORS with ALLOWED_ORIGINS whitelist', () => {
    it('should allow origins in the ALLOWED_ORIGINS list even in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://budgetizer.app,https://www.budgetizer.app';

      const whitelistApp = await createTestApp();
      whitelistApp.get('/api/contract-test', (_req, res) => res.json({ ok: true }));

      const res = await request(whitelistApp)
        .get('/api/contract-test')
        .set('Origin', 'https://budgetizer.app');

      expect(res.headers['access-control-allow-origin']).toBe('https://budgetizer.app');

      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'test';
    });
  });

  describe('NoSQL Injection Sanitization (express-mongo-sanitize)', () => {
    it('should strip $ and . from request body keys', async () => {
      const maliciousBody = {
        name: 'Test',
        '$where': '1==1',
        'profile.$set': { admin: true },
      };

      const res = await request(testApp)
        .post('/api/contract-test')
        .send(maliciousBody);

      expect(res.body.received.name).toBe('Test');
      expect(res.body.received['$where']).toBeUndefined();
      expect(res.body.received['profile.$set']).toBeUndefined();
    });
  });

  describe('Swagger API Docs Availability', () => {
    it('swaggerSpec should be a valid OpenAPI 3.0 document with routes defined', async () => {
      expect(swaggerSpec.openapi).toBe('3.0.0');
      expect(swaggerSpec.info.title).toBe('Budgetizer API Documentation');
      // Should have paths for all major endpoints
      expect(swaggerSpec.paths['/api/accounts']).toBeDefined();
      expect(swaggerSpec.paths['/api/auth/register']).toBeDefined();
    });

    it('/api-docs should redirect to /api-docs/', async () => {
      const res = await request(testApp).get('/api-docs');
      expect(res.status).toBe(301);
    });

    it('/api-docs/ should serve Swagger UI HTML', async () => {
      const res = await request(testApp).get('/api-docs/');
      expect(res.status).toBe(200);
      expect(res.text.length).toBeGreaterThan(100);
    });
  });
});

// --- Test: Auth Routes Validation Shapes -------------------------------------

describe('API Contract — Auth Routes Validation & Cookie Contracts', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'contract-test-secret';

    app = express();
    app.use(express.json());

    const authRoutes = await import('../routes/authRoutes.js').then((m) => m.default);
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register — Validation Errors', () => {
    it('should return 400 with errors array when body is empty', async () => {
      const res = await request(app).post('/api/auth/register').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('should return 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when password is too short (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: 'abc' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login — Validation Errors', () => {
    it('should return 400 with errors array when body is empty', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/logout — Cookie Clearing', () => {
    it('should clear the token cookie and return success message', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();

      const setCookieHeader = res.headers['set-cookie'];
      if (setCookieHeader && Array.isArray(setCookieHeader)) {
        const tokenCookie = setCookieHeader[0];
        expect(tokenCookie).toContain('token=');
        // Cookie should have past expiration to clear it
        expect(tokenCookie).toMatch(/Expires=Thu, 01 Jan 1970/);
      }
    });
  });

  describe('POST /api/auth/set-cookie — Token Contract', () => {
    it('should return 400 when token is missing from body', async () => {
      const res = await request(app).post('/api/auth/set-cookie').send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Token requis');
    });

    it('should set HttpOnly cookie when valid token is provided', async () => {
      const res = await request(app)
        .post('/api/auth/set-cookie')
        .send({ token: 'contract-test-jwt-token' });

      expect(res.status).toBe(200);

      const setCookieHeader = res.headers['set-cookie'];
      if (setCookieHeader && Array.isArray(setCookieHeader)) {
        const tokenCookie = setCookieHeader[0];
        expect(tokenCookie).toContain('token=contract-test-jwt-token');
        expect(tokenCookie).toContain('HttpOnly');
      }
    });
  });

  describe('POST /api/auth/forgot-password — Security Contract', () => {
    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});

// --- Test: Protected Routes Return 401 Without Auth --------------------------

describe('API Contract — Authentication Guard Enforcement on Protected Routes', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'contract-test-secret';

    app = express();
    app.use(express.json());

    const authRoutes = await import('../routes/authRoutes.js').then((m) => m.default);
    const accountRoutes = await import('../routes/accountRoutes.js').then((m) => m.default);
    const budgetRoutes = await import('../routes/budgetRoutes.js').then((m) => m.default);
    const transactionRoutes = await import('../routes/transactionRoutes.js').then((m) => m.default);

    app.use('/api/auth', authRoutes);
    app.use('/api/accounts', accountRoutes);
    app.use('/api/budgets', budgetRoutes);
    app.use('/api/transactions', transactionRoutes);
  });

  describe('401 Without Auth Token', () => {
    it('GET /api/accounts should return 401', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(401);
    });

    it('POST /api/accounts should return 401', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: 'Test', type: 'checking' });
      expect(res.status).toBe(401);
    });

    it('GET /api/budgets should return 401', async () => {
      const res = await request(app).get('/api/budgets');
      expect(res.status).toBe(401);
    });

    it('POST /api/transactions should return 401', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ amount: 50, type: 'expense' });
      expect(res.status).toBe(401);
    });

    it('GET /api/accounts/:id should return 401', async () => {
      const res = await request(app)
        .get('/api/accounts/60d21b4667d0d8992e610c88');
      expect(res.status).toBe(401);
    });

    it('DELETE /api/accounts/:id should return 401', async () => {
      const res = await request(app)
        .delete('/api/accounts/60d21b4667d0d8992e610c88');
      expect(res.status).toBe(401);
    });

    it('PUT /api/budgets/:id should return 401', async () => {
      const res = await request(app)
        .put('/api/budgets/60d21b4667d0d8992e610c88')
        .send({ amount: 500 });
      expect(res.status).toBe(401);
    });

    it('PATCH /api/accounts/reorder should return 401', async () => {
      const res = await request(app)
        .patch('/api/accounts/reorder')
        .send({ orderedIds: ['id1', 'id2'] });
      expect(res.status).toBe(401);
    });

    it('GET /api/accounts/:id/credit-summary should return 401', async () => {
      const res = await request(app)
        .get('/api/accounts/60d21b4667d0d8992e610c88/credit-summary');
      expect(res.status).toBe(401);
    });

    it('POST /api/budgets should return 401', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ categoryId: 'cat1', amount: 500 });
      expect(res.status).toBe(401);
    });
  });
});

// --- Test: express-validator Response Shape Contract -------------------------

describe('API Contract — express-validator v7 Response Shape', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const validator = await import('express-validator');

    app = express();
    app.use(express.json());

    // Replicate the validation middleware shape from accountRoutes POST /api/accounts
    app.post('/api/contract-validation-test', [
      validator.body('name', 'Name is required').not().isEmpty(),
      validator.body('type', 'Type must be valid').isIn(['checking', 'savings']),
    ], (req, res) => {
      const errors = validator.validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      res.json({ ok: true });
    });
  });

  it('should return errors array with msg, path, and location properties', async () => {
    const res = await request(app)
      .post('/api/contract-validation-test')
      .send({});

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);

    for (const err of res.body.errors) {
      expect(err).toHaveProperty('msg');
      expect(err).toHaveProperty('path');
      expect(err).toHaveProperty('location');
      expect(err.location).toBe('body');
    }
  });

  it('should return multiple validation errors in a single response', async () => {
    const res = await request(app)
      .post('/api/contract-validation-test')
      .send({ name: '', type: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// --- Test: Zod Schema Validation Contract -----------------------------------

describe('API Contract — Zod Schema Validation Contract', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const validateRequest = (await import('../middleware/validateRequest.js')).default;
    const { subscribePushSchema, unsubscribePushSchema } = await import('../services/validationSchemas.js');

    app = express();
    app.use(express.json());

    app.post('/api/notifications/subscribe', validateRequest(subscribePushSchema), (req, res) => {
      res.status(201).json({ message: 'Subscribed' });
    });

    app.post('/api/notifications/unsubscribe', validateRequest(unsubscribePushSchema), (req, res) => {
      res.json({ message: 'Unsubscribed' });
    });
  });

  it('POST /api/notifications/subscribe — returns 400 with field & message if payload is invalid', async () => {
    const res = await request(app)
      .post('/api/notifications/subscribe')
      .send({ subscription: { endpoint: '' } });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0]).toHaveProperty('field');
    expect(res.body.errors[0]).toHaveProperty('message');
  });

  it('POST /api/notifications/subscribe — returns 201 when subscription object is valid', async () => {
    const res = await request(app)
      .post('/api/notifications/subscribe')
      .send({
        subscription: {
          endpoint: 'https://push.service.com/endpoint123',
          keys: {
            p256dh: 'sample_p256dh',
            auth: 'sample_auth',
          },
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Subscribed');
  });

  it('POST /api/notifications/unsubscribe — returns 400 when endpoint is empty', async () => {
    const res = await request(app)
      .post('/api/notifications/unsubscribe')
      .send({ endpoint: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('endpoint');
  });

  it('POST /api/notifications/unsubscribe — returns 200 when endpoint is valid', async () => {
    const res = await request(app)
      .post('/api/notifications/unsubscribe')
      .send({ endpoint: 'https://push.service.com/endpoint123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Unsubscribed');
  });
});

