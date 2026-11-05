const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const env = require('../src/config/env');
const { generateToken } = require('../src/utils/token');

describe('Milestone 04D: Protected Profile API (GET /api/auth/me) & Auth Middleware', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const EXPECTED_UNAUTHORIZED_MESSAGE = 'Access denied. Invalid, expired, or missing authentication token.';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return 200 OK with user profile when given a valid Bearer token', async () => {
    const mockUser = new User({
      _id: mockUserId,
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      avatar: 'https://example.com/avatar.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

    const token = generateToken(mockUserId.toString());

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'User profile retrieved successfully');
    expect(res.body.data).toHaveProperty('user');

    const { user } = res.body.data;
    expect(user).toHaveProperty('id', mockUserId.toString());
    expect(user).toHaveProperty('name', 'Alex Morgan');
    expect(user).toHaveProperty('email', 'alex.morgan@example.com');
    expect(user).toHaveProperty('avatar', 'https://example.com/avatar.png');
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('_id');
    expect(user).not.toHaveProperty('__v');

    // Guarantee password hash never appears in response body
    expect(JSON.stringify(res.body)).not.toMatch(/"password"/);
  });

  it('should return 200 OK with user profile when given a valid lowercase bearer token', async () => {
    const mockUser = new User({
      _id: mockUserId,
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      avatar: 'https://example.com/avatar.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

    const token = generateToken(mockUserId.toString());

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.data.user).toHaveProperty('id', mockUserId.toString());
  });

  it('should return 401 Unauthorized when Authorization header is missing', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when Authorization header is not in Bearer format', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Basic dXNlcjpwYXNzd29yZA==');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when Bearer token is empty or whitespace', async () => {
    const emptyRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ');

    const whitespaceRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer    ');

    expect(emptyRes.status).toBe(401);
    expect(emptyRes.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
    expect(whitespaceRes.status).toBe(401);
    expect(whitespaceRes.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when Authorization header contains multiple tokens', async () => {
    const validToken = generateToken(mockUserId.toString());
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken} extraTokenValue`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when token is invalid or tampered', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when JWT contains a correctly signed but malformed subject', async () => {
    const malformedSubjectToken = jwt.sign(
      { sub: 'not-a-valid-mongo-id' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${malformedSubjectToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when JWT contains a malformed but castable subject', async () => {
    const castableSubjectToken = jwt.sign(
      { sub: '123456789012' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${castableSubjectToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when token has expired', async () => {
    const expiredToken = jwt.sign(
      { sub: mockUserId.toString() },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 401 Unauthorized when user has been deleted or no longer exists in database', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(null);

    const token = generateToken(mockUserId.toString());

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should return 500 Internal Server Error when database operation fails during user lookup', async () => {
    jest.spyOn(User, 'findById').mockRejectedValue(new Error('Database connection failed'));

    const token = generateToken(mockUserId.toString());

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body.message).toBe('Database connection failed');
  });

  it('should return the EXACT same standardized error message for all failure modes to avoid leaking auth details', async () => {
    const responses = [
      await request(app).get('/api/auth/me'),
      await request(app).get('/api/auth/me').set('Authorization', 'MalformedToken'),
      await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.here'),
    ];

    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(res.body.message).toBe(EXPECTED_UNAUTHORIZED_MESSAGE);
    }
  });
});
