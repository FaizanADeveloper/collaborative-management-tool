const { getDBStatus } = require('../config/db');

/**
 * Health check endpoint controller
 * Accurately reports API health, server timestamp, uptime, and database state
 */
const getHealth = (req, res) => {
  const dbStatus = getDBStatus();

  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {
      api: 'healthy',
      database: dbStatus,
    },
  });
};

module.exports = {
  getHealth,
};
