const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const { generateToken, verifyToken } = require('../src/utils/token');
const { registerSchema, loginSchema } = require('../src/validators/auth.validator');

describe('Milestone 04B: JWT Utility & Auth Validator Tests', () => {
  describe('JWT Utility (backend/src/utils/token.js)', () => {
    const mockUserId = '507f191e810c19729de860ea';

    it('should generate a valid JWT with the user id in the sub claim', () => {
      const token = generateToken(mockUserId);
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token);
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(mockUserId);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      // Verifies no email, password or extraneous fields in payload
      expect(decoded).not.toHaveProperty('email');
      expect(decoded).not.toHaveProperty('password');
    });

    it('should successfully verify a valid JWT and return decoded claims', () => {
      const token = generateToken(mockUserId);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe(mockUserId);
    });

    it('should throw an error when verifying a tampered token', () => {
      const token = generateToken(mockUserId);
      const tamperedToken = token.slice(0, -5) + 'abcde';

      expect(() => verifyToken(tamperedToken)).toThrow(jwt.JsonWebTokenError);
    });

    it('should throw an error when verifying an expired token', () => {
      const expiredToken = jwt.sign(
        { sub: mockUserId },
        env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '-1s' }
      );

      expect(() => verifyToken(expiredToken)).toThrow(jwt.TokenExpiredError);
    });

    it('should throw an error if userId is missing when generating a token', () => {
      expect(() => generateToken(null)).toThrow('User ID is required to generate a token');
      expect(() => generateToken('')).toThrow('User ID is required to generate a token');
    });

    it('should throw an error if token is missing when verifying', () => {
      expect(() => verifyToken(null)).toThrow('Token string is required for verification');
      expect(() => verifyToken('')).toThrow('Token string is required for verification');
    });

    it('should fail safely if JWT_SECRET is missing or empty', () => {
      const originalSecret = env.JWT_SECRET;
      try {
        env.JWT_SECRET = '';
        expect(() => generateToken(mockUserId)).toThrow('JWT_SECRET is missing or not configured');
        expect(() => verifyToken('some.token')).toThrow('JWT_SECRET is missing or not configured');
      } finally {
        env.JWT_SECRET = originalSecret;
      }
    });
  });

  describe('Authentication Validators (backend/src/validators/auth.validator.js)', () => {
    describe('Registration Schema (registerSchema)', () => {
      const validRegisterData = {
        name: 'Alex Morgan',
        email: 'ALEX.MORGAN@example.com',
        password: 'Password123',
        avatar: 'https://example.com/avatar.png',
      };

      it('should validate and normalize valid registration data', () => {
        const result = registerSchema.safeParse(validRegisterData);

        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Alex Morgan');
        // Verifies email normalization (lowercase)
        expect(result.data.email).toBe('alex.morgan@example.com');
      });

      it('should allow optional avatar to be omitted or empty', () => {
        const withoutAvatar = {
          name: 'Alex Morgan',
          email: 'alex@example.com',
          password: 'Password123',
        };
        const emptyAvatar = { ...withoutAvatar, avatar: '' };

        expect(registerSchema.safeParse(withoutAvatar).success).toBe(true);
        expect(registerSchema.safeParse(emptyAvatar).success).toBe(true);
      });

      it('should reject registration if name is shorter than 2 characters', () => {
        const result = registerSchema.safeParse({
          ...validRegisterData,
          name: 'A',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/at least 2 characters/);
      });

      it('should reject registration if email is invalid', () => {
        const result = registerSchema.safeParse({
          ...validRegisterData,
          email: 'not-an-email',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/valid email/);
      });

      it('should reject registration if password is shorter than 8 characters', () => {
        const result = registerSchema.safeParse({
          ...validRegisterData,
          password: 'Pass1',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/at least 8 characters/);
      });

      it('should reject registration if password has no uppercase letter', () => {
        const result = registerSchema.safeParse({
          ...validRegisterData,
          password: 'password123',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/uppercase letter/);
      });

      it('should reject registration if password has no number', () => {
        const result = registerSchema.safeParse({
          ...validRegisterData,
          password: 'PasswordOnly',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/number/);
      });

      it('should reject registration if avatar is not a valid URL', () => {
        const result = registerSchema.safeParse({
          ...validRegisterData,
          avatar: 'invalid-url',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/valid URL/);
      });
    });

    describe('Login Schema (loginSchema)', () => {
      it('should validate and normalize valid login data', () => {
        const result = loginSchema.safeParse({
          email: 'USER@EXAMPLE.COM',
          password: 'AnyPassword123',
        });

        expect(result.success).toBe(true);
        expect(result.data.email).toBe('user@example.com');
      });

      it('should reject login if email is invalid', () => {
        const result = loginSchema.safeParse({
          email: 'invalid-email',
          password: 'AnyPassword123',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/valid email/);
      });

      it('should reject login if password is empty or missing', () => {
        const emptyPassword = loginSchema.safeParse({
          email: 'user@example.com',
          password: '',
        });
        const missingPassword = loginSchema.safeParse({
          email: 'user@example.com',
        });

        expect(emptyPassword.success).toBe(false);
        expect(missingPassword.success).toBe(false);
      });
    });
  });
});
