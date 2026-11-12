const mongoose = require('mongoose');
const User = require('../models/User');
const { verifyToken } = require('../utils/token');

const SOCKET_AUTH_ERROR_MESSAGE =
  'Authentication error: Invalid, expired, or missing authentication token.';

/**
 * Extracts a JWT token from Socket.IO handshake auth payload or Bearer header.
 * Never logs or exposes token contents on failure.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {string|null}
 */
const extractSocketToken = (socket) => {
  const authToken = socket?.handshake?.auth?.token;
  if (typeof authToken === 'string') {
    const trimmed = authToken.trim();
    if (trimmed) {
      if (/^bearer\s+/i.test(trimmed)) {
        const parts = trimmed.split(/\s+/);
        return parts.length === 2 && parts[1] ? parts[1] : null;
      }
      return trimmed;
    }
  }

  const authHeader = socket?.handshake?.headers?.authorization;
  if (typeof authHeader === 'string' && /^bearer\s+/i.test(authHeader)) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer' && parts[1]) {
      return parts[1];
    }
  }

  return null;
};

/**
 * Socket.IO connection handshake authentication middleware.
 * Validates JWT signature/expiry and confirms an active User record before
 * attaching sanitized identity fields to socket.data.
 *
 * @param {import('socket.io').Socket} socket
 * @param {(err?: Error) => void} next
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = extractSocketToken(socket);
    if (!token) {
      return next(new Error(SOCKET_AUTH_ERROR_MESSAGE));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return next(new Error(SOCKET_AUTH_ERROR_MESSAGE));
    }

    if (!decoded || !decoded.sub || !mongoose.isObjectIdOrHexString(decoded.sub)) {
      return next(new Error(SOCKET_AUTH_ERROR_MESSAGE));
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return next(new Error(SOCKET_AUTH_ERROR_MESSAGE));
    }

    const userId = user._id ? user._id.toString() : String(user.id);
    socket.data.userId = userId;
    socket.data.user = {
      id: userId,
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
    };

    return next();
  } catch {
    return next(new Error(SOCKET_AUTH_ERROR_MESSAGE));
  }
};

module.exports = {
  SOCKET_AUTH_ERROR_MESSAGE,
  extractSocketToken,
  socketAuthMiddleware,
};
