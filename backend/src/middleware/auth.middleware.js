const mongoose = require('mongoose');
const User = require('../models/User');
const { verifyToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const UNAUTHORIZED_MESSAGE = 'Access denied. Invalid, expired, or missing authentication token.';

/**
 * Authentication middleware verifying Bearer JWT and attaching user to req.user
 * Returns a standardized HTTP 401 response for all missing, malformed, invalid, or expired tokens
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string' || !/^bearer\s+/i.test(authHeader)) {
    throw ApiError.unauthorized(UNAUTHORIZED_MESSAGE);
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    throw ApiError.unauthorized(UNAUTHORIZED_MESSAGE);
  }

  const token = parts[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    // Never expose token verification errors or stack traces to clients
    throw ApiError.unauthorized(UNAUTHORIZED_MESSAGE);
  }

  if (!decoded || !decoded.sub || !mongoose.isObjectIdOrHexString(decoded.sub)) {
    throw ApiError.unauthorized(UNAUTHORIZED_MESSAGE);
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw ApiError.unauthorized(UNAUTHORIZED_MESSAGE);
  }

  req.user = user;
  next();
});

module.exports = authenticate;
