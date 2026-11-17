const { getDBStatus } = require('../config/db');
const { getRedisStatus, getAdapterStatus } = require('../redis');

/**
 * Health check endpoint controller.
 * Accurately reports API health, server timestamp, uptime, database state,
 * Redis connection status, and Socket.IO adapter operational mode.
 * Never exposes credentials, hostnames, or sensitive internal parameters.
 */
const getHealth = (req, res) => {
  const dbStatus = getDBStatus();
  const redisStatus = getRedisStatus();
  const adapterStatus = getAdapterStatus();

  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {
      api: 'healthy',
      database: dbStatus,
      redis: redisStatus,
      socketAdapter: adapterStatus,
    },
  });
};

module.exports = {
  getHealth,
};
