const User = require('../models/User');
const { generateToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');

/**
 * Registers a new user account
 * @param {object} userData - { name, email, password, avatar }
 * @returns {Promise<{ user: object, token: string }>}
 */
const register = async ({ name, email, password, avatar }) => {
  // Check for existing user by normalized email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  let user;
  try {
    user = await User.create({
      name,
      email,
      password,
      avatar,
    });
  } catch (error) {
    // Handle concurrent duplicate key race conditions (Mongo error code 11000)
    if (error.code === 11000) {
      throw ApiError.conflict('An account with this email address already exists');
    }
    throw error;
  }

  const token = generateToken(user._id.toString());
  const userResponse = user.toJSON ? user.toJSON() : user;

  return {
    user: userResponse,
    token,
  };
};

/**
 * Authenticates user credentials and issues a JWT
 * @param {object} credentials - { email, password }
 * @returns {Promise<{ user: object, token: string }>}
 */
const login = async ({ email, password }) => {
  const genericErrorMessage = 'Invalid email or password';

  // Explicitly select password hash for constant-time comparison
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw ApiError.unauthorized(genericErrorMessage);
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw ApiError.unauthorized(genericErrorMessage);
  }

  const token = generateToken(user._id.toString());
  const userResponse = user.toJSON ? user.toJSON() : user;

  return {
    user: userResponse,
    token,
  };
};

module.exports = {
  register,
  login,
};
