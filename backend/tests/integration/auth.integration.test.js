const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { createTestContext, connectDB, disconnectDB } = require('./testContext');

describe('Live MongoDB Atlas Integration Tests: Authentication & Profile APIs', () => {
  let context;
  let baselineState;
  const testPassword = 'AtlasIntegrationPass2026!';

  beforeAll(async () => {
    // 1. Establish live connection to Atlas
    await connectDB();

    // 2. Instantiate isolated test context with unique runId
    context = createTestContext();

    // 3. Capture baseline snapshot of pre-existing records (Postman data)
    baselineState = await context.captureExistingState();
  }, 15000);

  afterAll(async () => {
    let preservationError;
    try {
      // 1. First attempt to assert that pre-existing non-test records remained completely untouched
      if (context && baselineState) {
        await context.verifyPreservation(baselineState);
      }
    } catch (err) {
      preservationError = err;
    } finally {
      let cleanupError;
      try {
        // 2. Put cleanup inside nested finally so it executes even if preservation check fails
        if (context) {
          await context.cleanupRegisteredRecords();
        }
      } catch (err) {
        cleanupError = err;
      } finally {
        // 3. Put disconnectDB in outer finally so it executes even if cleanup fails
        await disconnectDB();
      }

      // Do not suppress or silently swallow errors
      if (preservationError) {
        throw preservationError;
      }
      if (cleanupError) {
        throw cleanupError;
      }
    }
  }, 15000);

  describe('POST /api/auth/register (Live Atlas)', () => {
    it('should register a new user in Atlas with hashed password and return HTTP 201 with JWT', async () => {
      const email = context.generateTestEmail('reg');
      const payload = {
        name: 'Integration Test User',
        email,
        password: testPassword,
        avatar: 'https://example.com/avatar.png',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(payload);

      // Register created ID immediately before assertions
      if (res.body && res.body.data && res.body.data.user && res.body.data.user.id) {
        context.registerUserId(res.body.data.user.id);
      }

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');

      const userId = res.body.data.user.id;
      expect(userId).toBeDefined();

      // Verify persistence in live MongoDB Atlas collection
      const atlasUser = await User.findById(userId).select('+password');
      expect(atlasUser).not.toBeNull();
      expect(atlasUser.email).toBe(email);
      expect(atlasUser.name).toBe('Integration Test User');

      // Verify password hashing (bcrypt hash must start with $2a$ or $2b$, never plaintext)
      expect(atlasUser.password).toMatch(/^\$2[ab]\$/);
      expect(atlasUser.password).not.toBe(testPassword);

      // Verify response envelope never returns password hash or internal version
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data.user).not.toHaveProperty('__v');
      expect(res.body.data.user).not.toHaveProperty('_id');
    });

    it('should enforce MongoDB Atlas unique index and return HTTP 409 Conflict on duplicate email', async () => {
      const duplicateEmail = context.generateTestEmail('dup');

      // Create initial user
      const firstRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First Registered User',
          email: duplicateEmail,
          password: testPassword,
        });

      if (firstRes.body && firstRes.body.data && firstRes.body.data.user && firstRes.body.data.user.id) {
        context.registerUserId(firstRes.body.data.user.id);
      }

      expect(firstRes.status).toBe(201);

      // Attempt duplicate registration with the exact same email
      const secondRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Registrant',
          email: duplicateEmail,
          password: testPassword,
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body).toHaveProperty('success', false);
      expect(secondRes.body.message).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login (Live Atlas)', () => {
    let loginEmail;
    let registeredUserId;

    beforeAll(async () => {
      loginEmail = context.generateTestEmail('login');
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Login Test Subject',
          email: loginEmail,
          password: testPassword,
        });

      if (res.body && res.body.data && res.body.data.user && res.body.data.user.id) {
        registeredUserId = res.body.data.user.id;
        context.registerUserId(registeredUserId);
      }

      expect(res.status).toBe(201);
    });

    it('should authenticate against live Atlas hash and return HTTP 200 with JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(loginEmail);
      expect(res.body.data.user.id).toBe(registeredUserId);
    });

    it('should reject invalid password with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginEmail,
          password: 'CompletelyWrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });
  });

  describe('GET /api/auth/me (Live Atlas)', () => {
    let userEmail;
    let userToken;
    let profileUserId;

    beforeAll(async () => {
      userEmail = context.generateTestEmail('profile');
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Profile Inspectee',
          email: userEmail,
          password: testPassword,
          avatar: 'https://example.com/profile.png',
        });

      if (res.body && res.body.data && res.body.data.user && res.body.data.user.id) {
        profileUserId = res.body.data.user.id;
        context.registerUserId(profileUserId);
      }
      userToken = res.body.data ? res.body.data.token : null;

      expect(res.status).toBe(201);
    });

    it('should retrieve current user profile from Atlas when supplied with valid JWT Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.user.id).toBe(profileUserId);
      expect(res.body.data.user.email).toBe(userEmail);
      expect(res.body.data.user.avatar).toBe('https://example.com/profile.png');
    });

    it('should reject unauthenticated request with HTTP 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Preservation Verification (Live Atlas)', () => {
    it('should confirm that pre-existing Postman records remain intact throughout test run', async () => {
      await context.verifyPreservation(baselineState);
    });
  });
});
