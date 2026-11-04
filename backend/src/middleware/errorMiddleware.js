const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Cannot ${req.method} ${req.originalUrl} - Route not found`));
};

/**
 * Centralized Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    error = new ApiError(400, 'Validation Error', issues);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyValue || {}).join(', ');
    error = new ApiError(409, `Duplicate value for field(s): ${duplicateFields}`);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    error = new ApiError(400, `Validation Error: ${messages.join(', ')}`);
  }

  // Fallback status code and message
  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  const message = error.message || 'Internal server error';

  const response = {
    success: false,
    status,
    message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
