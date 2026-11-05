const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { verifyToken } = require('../src/utils/token');

describe('Milestone 04C: Authentication APIs (POST /register & POST /login)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegisterPayload = {
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      password: 'Password123',
    };

    it('should register a new user successfully and return HTTP 201 with JWT', async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockCreatedUser = new User({
        _id: mockUserId,
        name: 'Alex Morgan',
        email: 'alex.morgan@example.com',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'create').mockResolvedValue(mockCreatedUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegisterPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');

      // Verify user payload shape
      const { user, token } = res.body.data;
      expect(user).toHaveProperty('id', mockUserId.toString());
      expect(user).toHaveProperty('name', 'Alex Morgan');
      expect(user).toHaveProperty('email', 'alex.morgan@example.com');
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('_id');
      expect(user).not.toHaveProperty('__v');

      // Verify token integrity
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(mockUserId.toString());

      // Guarantee password hash is never serialized
      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toMatch(/"password"/);
    });

    it('should return 409 Conflict when an account with the email already exists', async () => {
      const existingUser = new User({
        name: 'Existing User',
        email: 'alex.morgan@example.com',
        password: 'HashedPassword123',
      });

      jest.spyOn(User, 'findOne').mockResolvedValue(existingUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegisterPayload);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 'fail');
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 409 Conflict on MongoDB duplicate key error (code 11000)', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const duplicateError = new Error('E11000 duplicate key error');
      duplicateError.code = 11000;
      duplicateError.keyValue = { email: 'alex.morgan@example.com' };
      jest.spyOn(User, 'create').mockRejectedValue(duplicateError);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegisterPayload);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 'fail');
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 Bad Request with field errors when registration data is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'A',
          email: 'invalid-email-format',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 'fail');
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);

      const fieldsWithErrors = res.body.errors.map((e) => e.field);
      expect(fieldsWithErrors).toContain('name');
      expect(fieldsWithErrors).toContain('email');
      expect(fieldsWithErrors).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginPayload = {
      email: 'alex.morgan@example.com',
      password: 'Password123',
    };

    it('should authenticate valid credentials and return HTTP 200 with JWT', async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockUser = new User({
        _id: mockUserId,
        name: 'Alex Morgan',
        email: 'alex.morgan@example.com',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockUser.comparePassword = jest.fn().mockResolvedValue(true);

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(validLoginPayload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'Authentication successful');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');

      const { user, token } = res.body.data;
      expect(user).toHaveProperty('id', mockUserId.toString());
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('_id');
      expect(user).not.toHaveProperty('__v');

      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(mockUserId.toString());

      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toMatch(/"password"/);
    });

    it('should return 401 Unauthorized for an unknown email', async () => {
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 'fail');
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 401 Unauthorized for an incorrect password', async () => {
      const mockUser = new User({
        name: 'Alex Morgan',
        email: 'alex.morgan@example.com',
      });
      mockUser.comparePassword = jest.fn().mockResolvedValue(false);

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alex.morgan@example.com',
          password: 'WrongPassword999',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 'fail');
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return the EXACT same generic error message for unknown email and wrong password to prevent user enumeration', async () => {
      // 1. Unknown email attempt
      jest.spyOn(User, 'findOne').mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(null),
      });
      const unknownEmailRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'Password123' });

      // 2. Wrong password attempt
      const mockUser = new User({ email: 'alex.morgan@example.com' });
      mockUser.comparePassword = jest.fn().mockResolvedValue(false);
      jest.spyOn(User, 'findOne').mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      const wrongPasswordRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.morgan@example.com', password: 'WrongPassword123' });

      expect(unknownEmailRes.status).toBe(401);
      expect(wrongPasswordRes.status).toBe(401);
      expect(unknownEmailRes.body.message).toBe('Invalid email or password');
      expect(wrongPasswordRes.body.message).toBe('Invalid email or password');
      expect(unknownEmailRes.body.message).toBe(wrongPasswordRes.body.message);
    });

    it('should return 400 Bad Request when login payload is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 'fail');
      expect(res.body).toHaveProperty('errors');
    });
  });
});
