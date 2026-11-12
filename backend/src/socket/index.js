const { Server } = require('socket.io');
const env = require('../config/env');
const { socketAuthMiddleware } = require('./auth');
const { registerRoomHandlers } = require('./rooms');

let ioInstance = null;

/**
 * Initializes and attaches a Socket.IO server to an existing Node HTTP server.
 * Reuses application CORS configuration and enforces JWT handshake authentication.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    Promise.resolve(registerRoomHandlers(io, socket)).catch(() => {
      // Prevent unhandled promise rejections on connection setup
      socket.disconnect(true);
    });
  });

  ioInstance = io;
  return io;
};

/**
 * Returns the active Socket.IO server instance if initialized.
 *
 * @returns {import('socket.io').Server|null}
 */
const getIO = () => ioInstance;

/**
 * Cleanly closes the active Socket.IO server and clears the singleton reference.
 *
 * @returns {Promise<void>}
 */
const closeSocketServer = async () => {
  if (!ioInstance) return;
  const activeIO = ioInstance;
  ioInstance = null;

  await new Promise((resolve) => {
    activeIO.close(() => resolve());
  });
};

module.exports = {
  initSocketServer,
  getIO,
  closeSocketServer,
};
