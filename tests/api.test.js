/**
 * Integration tests for the Finance Dashboard API.
 * Uses an in-memory MongoDB connection via mongoose.
 *
 * Run: npm test
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { User, ROLES } = require('../src/models/User');
const { Transaction, TRANSACTION_TYPES, CATEGORIES } = require('../src/models/Transaction');

// ─── Test Database Setup ──────────────────────────────────────────────────────

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/finance_test_db');
});

afterEach(async () => {
  await User.deleteMany({});
  await Transaction.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createUser = async (overrides = {}) => {
  const defaults = { name: 'Test User', email: 'test@test.com', password: 'password123', role: ROLES.VIEWER };
  return User.create({ ...defaults, ...overrides });
};

const loginUser = async (email = 'test@test.com', password = 'password123') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data?.token;
};

const getAuthHeader = (token) => ({ Authorization: `Bearer ${token}` });

const seedAdmin = async () => {
  await createUser({ name: 'Admin User', email: 'admin@test.com', password: 'password123', role: ROLES.ADMIN });
  const token = await loginUser('admin@test.com');
  return token;
};

const seedAnalyst = async () => {
  await createUser({ name: 'Analyst User', email: 'analyst@test.com', password: 'password123', role: ROLES.ANALYST });
  const token = await loginUser('analyst@test.com');
  return token;
};

const seedViewer = async () => {
  await createUser({ name: 'Viewer User', email: 'viewer@test.com', password: 'password123', role: ROLES.VIEWER });
  const token = await loginUser('viewer@test.com');
  return token;
};

const sampleTransaction = {
  amount: 1500,
  type: TRANSACTION_TYPES.INCOME,
  category: CATEGORIES.SALARY,
  description: 'Monthly salary',
};

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user with default viewer role', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe(ROLES.VIEWER);
    });

    it('returns 409 for duplicate email', async () => {
      await createUser();
      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate',
        email: 'test@test.com',
        password: 'password123',
      });
      expect(res.status).toBe(409);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'password123',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(() => createUser());

    it('logs in with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@test.com',
        password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@test.com',
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for non-existent user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@test.com',
        password: 'password123',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns profile for authenticated user', async () => {
      await createUser();
      const token = await loginUser();
      const res = await request(app).get('/api/auth/me').set(getAuthHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('test@test.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});

// ─── User Routes Tests ────────────────────────────────────────────────────────

describe('User Routes', () => {
  describe('GET /api/users', () => {
    it('allows admin to list all users', async () => {
      const token = await seedAdmin();
      const res = await request(app).get('/api/users').set(getAuthHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    it('denies viewer access to user list', async () => {
      const token = await seedViewer();
      const res = await request(app).get('/api/users').set(getAuthHeader(token));
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('allows admin to update user role', async () => {
      const adminToken = await seedAdmin();
      const viewer = await createUser({ email: 'v@test.com', role: ROLES.VIEWER });

      const res = await request(app)
        .patch(`/api/users/${viewer._id}`)
        .set(getAuthHeader(adminToken))
        .send({ role: ROLES.ANALYST });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe(ROLES.ANALYST);
    });

    it('prevents non-admin from changing another user', async () => {
      const viewerToken = await seedViewer();
      const other = await createUser({ email: 'other@test.com' });

      const res = await request(app)
        .patch(`/api/users/${other._id}`)
        .set(getAuthHeader(viewerToken))
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });
});

// ─── Transaction Routes Tests ─────────────────────────────────────────────────

describe('Transaction Routes', () => {
  describe('POST /api/transactions', () => {
    it('allows analyst to create a transaction', async () => {
      const token = await seedAnalyst();
      const res = await request(app)
        .post('/api/transactions')
        .set(getAuthHeader(token))
        .send(sampleTransaction);

      expect(res.status).toBe(201);
      expect(res.body.data.transaction.amount).toBe(1500);
    });

    it('denies viewer from creating a transaction', async () => {
      const token = await seedViewer();
      const res = await request(app)
        .post('/api/transactions')
        .set(getAuthHeader(token))
        .send(sampleTransaction);

      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid amount', async () => {
      const token = await seedAnalyst();
      const res = await request(app)
        .post('/api/transactions')
        .set(getAuthHeader(token))
        .send({ ...sampleTransaction, amount: -100 });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid category', async () => {
      const token = await seedAnalyst();
      const res = await request(app)
        .post('/api/transactions')
        .set(getAuthHeader(token))
        .send({ ...sampleTransaction, category: 'not_a_real_category' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      const analyst = await createUser({ email: 'a@test.com', role: ROLES.ANALYST });
      await Transaction.create({ ...sampleTransaction, createdBy: analyst._id });
    });

    it('allows viewer to list transactions', async () => {
      const token = await seedViewer();
      const res = await request(app).get('/api/transactions').set(getAuthHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBeGreaterThan(0);
    });

    it('supports type filter', async () => {
      const token = await seedViewer();
      const res = await request(app)
        .get('/api/transactions?type=income')
        .set(getAuthHeader(token));
      expect(res.status).toBe(200);
      res.body.data.transactions.forEach((t) => expect(t.type).toBe('income'));
    });

    it('supports pagination meta', async () => {
      const token = await seedViewer();
      const res = await request(app).get('/api/transactions?page=1&limit=5').set(getAuthHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('DELETE /api/transactions/:id (soft delete)', () => {
    it('soft-deletes a transaction and hides it from list', async () => {
      const analystToken = await seedAnalyst();
      const analyst = await User.findOne({ email: 'analyst@test.com' });

      const tx = await Transaction.create({ ...sampleTransaction, createdBy: analyst._id });

      await request(app)
        .delete(`/api/transactions/${tx._id}`)
        .set(getAuthHeader(analystToken));

      const res = await request(app).get('/api/transactions').set(getAuthHeader(analystToken));
      const ids = res.body.data.transactions.map((t) => t._id);
      expect(ids).not.toContain(tx._id.toString());
    });
  });
});

// ─── Dashboard Routes Tests ───────────────────────────────────────────────────

describe('Dashboard Routes', () => {
  let analystToken;

  beforeEach(async () => {
    analystToken = await seedAnalyst();
    const analyst = await User.findOne({ email: 'analyst@test.com' });
    await Transaction.insertMany([
      { amount: 5000, type: TRANSACTION_TYPES.INCOME, category: CATEGORIES.SALARY, createdBy: analyst._id, date: new Date() },
      { amount: 200, type: TRANSACTION_TYPES.EXPENSE, category: CATEGORIES.FOOD, createdBy: analyst._id, date: new Date() },
      { amount: 800, type: TRANSACTION_TYPES.EXPENSE, category: CATEGORIES.HOUSING, createdBy: analyst._id, date: new Date() },
    ]);
  });

  it('GET /api/dashboard/summary returns correct totals', async () => {
    const res = await request(app).get('/api/dashboard/summary').set(getAuthHeader(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.data.totalIncome).toBe(5000);
    expect(res.body.data.totalExpenses).toBe(1000);
    expect(res.body.data.netBalance).toBe(4000);
  });

  it('GET /api/dashboard/categories returns category breakdown', async () => {
    const res = await request(app).get('/api/dashboard/categories').set(getAuthHeader(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.data.breakdown.length).toBeGreaterThan(0);
  });

  it('GET /api/dashboard/trends/monthly returns trend data', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends/monthly?months=3')
      .set(getAuthHeader(analystToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.trends)).toBe(true);
  });

  it('GET /api/dashboard/recent returns latest transactions', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent?limit=5')
      .set(getAuthHeader(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.data.transactions.length).toBeLessThanOrEqual(5);
  });

  it('GET /api/dashboard/top-categories returns top expenses', async () => {
    const res = await request(app)
      .get('/api/dashboard/top-categories?limit=3')
      .set(getAuthHeader(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
  });

  it('denies viewer access to dashboard', async () => {
    const viewerToken = await seedViewer();
    const res = await request(app).get('/api/dashboard/summary').set(getAuthHeader(viewerToken));
    expect(res.status).toBe(403);
  });
});

// ─── General API Tests ────────────────────────────────────────────────────────

describe('General', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Unknown routes return 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
