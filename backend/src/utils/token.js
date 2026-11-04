const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Retrieves and validates the centralized JWT secret
 * Fails safely if the secret is missing or empty
 */
const getJwtSecret = () => {
  const secret = env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('JWT_SECRET is missing or not configured');
  }
  return secret;
};

/**
 * Retrieves the centralized token expiration window
 */
const getJwtExpiresIn = () => {
  return env.JWT_EXPIRES_IN || '7d';
};

/**
 * Generates an HS256-signed JWT containing only the userId in the standard 'sub' claim
 * @param {string} userId - The user's unique identifier
 * @returns {string} Signed JWT token string
 */
const generateToken = (userId) => {
  if (!userId) {
    throw new Error('User ID is required to generate a token');
  }

  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();

  return jwt.sign(
    {
      sub: String(userId),
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn,
    }
  );
};

/**
 * Verifies and decodes an HS256 JWT
 * @param {string} token - The JWT string to verify
 * @returns {object} Decoded token payload with 'sub', 'iat', and 'exp'
 */
const verifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token string is required for verification');
  }

  const secret = getJwtSecret();

  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
  });
};

module.exports = {
  generateToken,
  verifyToken,
};
