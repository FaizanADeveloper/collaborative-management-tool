const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
const { resolveAllowedOrigins } = require('./utils/corsOrigins');

const app = express();

// Trust reverse proxy (Render, Railway, ALB, Cloudflare) in production for rate limiting and IP resolution
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: resolveAllowedOrigins(env.CLIENT_URL),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging (disabled in test environment)
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Request body parsers with explicit size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Catch-all 404 handler for undefined endpoints
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
