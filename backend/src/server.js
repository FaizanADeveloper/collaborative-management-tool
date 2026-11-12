const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocketServer, closeSocketServer } = require('./socket');

let server;

const startServer = async () => {
  try {
    // Attempt database connection
    await connectDB();

    server = http.createServer(app);
    initSocketServer(server);

    server.listen(env.PORT, () => {
      console.log(`[Server] Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[Server] Health check endpoint: http://localhost:${env.PORT}/api/health`);
      console.log(`[Server] Socket.IO realtime gateway initialized on port ${env.PORT}`);
    });
  } catch (error) {
    console.error(`[Server Error] Startup failed: ${error.message}`);
    process.exit(1);
  }
};

const finishShutdown = async () => {
  try {
    await disconnectDB();
    console.log('[Server] Graceful shutdown completed.');
    process.exit(0);
  } catch (err) {
    console.error(`[Server Error] Error during database disconnect: ${err.message}`);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  try {
    await closeSocketServer();
  } catch (err) {
    console.error(`[Server Error] Error closing Socket.IO server: ${err.message}`);
  }

  if (server && server.listening) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await finishShutdown();
    });
  } else {
    await finishShutdown();
  }

  // Force shutdown if cleanup takes longer than 10 seconds
  setTimeout(() => {
    console.error('[Server Error] Forceful shutdown initiated due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[Process Error] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Process Error] Uncaught Exception:', error);
  process.exit(1);
});

// Start server when executed directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer, gracefulShutdown };
