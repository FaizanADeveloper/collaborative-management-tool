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

module.exports = {
  register,
  login,
};
