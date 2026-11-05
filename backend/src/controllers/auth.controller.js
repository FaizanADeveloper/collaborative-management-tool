const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'User registered successfully',
    data: result,
  });
});

/**
 * Authenticate user and return JWT
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Authentication successful',
    data: result,
  });
});

/**
 * Retrieve authenticated user profile
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = req.user.toJSON ? req.user.toJSON() : req.user;

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'User profile retrieved successfully',
    data: {
      user,
    },
  });
});

module.exports = {
  register,
  login,
  getMe,
};
