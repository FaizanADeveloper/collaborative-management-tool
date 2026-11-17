const Redis = require('ioredis');
const env = require('../config/env');

let primaryClient = null;
const registeredClients = new Set();

let redisStatus = {
  configured: Boolean(env.REDIS_URL),
  status: env.REDIS_URL ? 'uninitialized' : 'not_configured',
  lastError: null,
};

/**
 * Safely sanitizes an error message or string so credentials in URLs are never logged or exposed.
 *
 * @param {string} msg
 * @returns {string}
 */
const sanitizeRedisErrorMessage = (msg) => {
  if (typeof msg !== 'string') return 'Unknown Redis error';
  return msg.replace(/:\/\/[^@/]+@/g, '://<credentials>@');
};

/**
 * Creates a new ioredis client instance configured with Flowdesk production defaults.
 *
 * @param {object} [customOptions={}]
 * @returns {import('ioredis').Redis|null}
 */
const createRedisClient = (customOptions = {}) => {
  if (!env.REDIS_URL) {
    return null;
  }

  const defaultOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 8000,
    retryStrategy(times) {
      if (times > 8) {
        // Limit reconnection attempts so failing offline environments don't loop endlessly
        return null;
      }
      return Math.min(times * 150, 3000);
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((target) => err.message && err.message.includes(target));
    },
  };

  const client = new Redis(env.REDIS_URL, {
    ...defaultOptions,
    ...customOptions,
  });

  registeredClients.add(client);

  client.on('error', (err) => {
    const safeMsg = sanitizeRedisErrorMessage(err?.message || 'Redis client error');
    redisStatus.lastError = safeMsg;
    if (client === primaryClient) {
      redisStatus.status = 'error';
    }
    // Safe console logging without connection secrets
    if (env.NODE_ENV !== 'test') {
      console.warn(`[Redis Error] ${safeMsg}`);
    }
  });

  client.on('connect', () => {
    if (client === primaryClient) {
      redisStatus.status = 'connecting';
    }
  });

  client.on('ready', () => {
    if (client === primaryClient) {
      redisStatus.status = 'ready';
      redisStatus.lastError = null;
      if (env.NODE_ENV !== 'test') {
        console.log('[Redis] Primary client connected and ready.');
      }
    }
  });

  client.on('reconnecting', () => {
    if (client === primaryClient) {
      redisStatus.status = 'reconnecting';
      if (env.NODE_ENV !== 'test') {
        console.warn('[Redis] Primary client reconnecting...');
      }
    }
  });

  client.on('close', () => {
    if (client === primaryClient && redisStatus.status === 'ready') {
      redisStatus.status = 'closed';
    }
  });

  client.on('end', () => {
    if (client === primaryClient) {
      redisStatus.status = 'closed';
    }
  });

  return client;
};

/**
 * Initializes the primary singleton Redis client if REDIS_URL is present.
 * Returns the connected client or null if not configured / unavailable.
 * Never throws an uncaught error to prevent application crashes when Redis is offline.
 *
 * @returns {Promise<import('ioredis').Redis|null>}
 */
const initRedis = async () => {
  if (!env.REDIS_URL) {
    redisStatus = {
      configured: false,
      status: 'not_configured',
      lastError: null,
    };
    return null;
  }

  if (primaryClient && (primaryClient.status === 'ready' || primaryClient.status === 'connecting')) {
    return primaryClient;
  }

  try {
    if (!primaryClient) {
      primaryClient = createRedisClient();
    }

    if (primaryClient.status !== 'ready' && primaryClient.status !== 'connecting') {
      await primaryClient.connect();
    }

    redisStatus = {
      configured: true,
      status: 'ready',
      lastError: null,
    };

    return primaryClient;
  } catch (err) {
    const safeError = sanitizeRedisErrorMessage(err?.message || 'Failed to connect to Redis');
    redisStatus = {
      configured: true,
      status: 'unavailable',
      lastError: safeError,
    };
    if (env.NODE_ENV !== 'test') {
      console.warn(`[Redis] Connection failed, operating in degraded in-memory mode: ${safeError}`);
    }
    return null;
  }
};

/**
 * Returns the primary Redis client instance (or null if not initialized).
 *
 * @returns {import('ioredis').Redis|null}
 */
const getRedisClient = () => primaryClient;

/**
 * Returns a safe status summary object for the health check and monitoring systems.
 * Never exposes credentials or internal URI tokens.
 *
 * @returns {{ configured: boolean, status: string, mode: string, error?: string }}
 */
const getRedisStatus = () => {
  if (!env.REDIS_URL) {
    return {
      configured: false,
      status: 'not_configured',
      mode: 'in_memory_fallback',
    };
  }

  const isReady = primaryClient && primaryClient.status === 'ready';
  const currentStatus = isReady
    ? 'ready'
    : redisStatus.status || primaryClient?.status || 'unavailable';

  return {
    configured: true,
    status: currentStatus,
    mode: isReady ? 'redis' : 'in_memory_fallback',
    ...(redisStatus.lastError ? { error: redisStatus.lastError } : {}),
  };
};

/**
 * Gracefully terminates all active and registered Redis clients.
 *
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
  const clientsToClose = Array.from(registeredClients);
  registeredClients.clear();

  await Promise.all(
    clientsToClose.map(async (client) => {
      try {
        if (client.status === 'ready' || client.status === 'connecting') {
          let timeoutHandle;
          const timeoutPromise = new Promise((resolve) => {
            timeoutHandle = setTimeout(() => {
              try {
                client.disconnect();
              } catch (_) {}
              resolve();
            }, 2000);
          });

          try {
            await Promise.race([
              client.quit().finally(() => clearTimeout(timeoutHandle)),
              timeoutPromise,
            ]);
          } finally {
            clearTimeout(timeoutHandle);
          }
        } else {
          client.disconnect();
        }
      } catch (_) {
        try {
          client.disconnect();
        } catch (_) {}
      }
    })
  );

  primaryClient = null;
  redisStatus = {
    configured: Boolean(env.REDIS_URL),
    status: env.REDIS_URL ? 'closed' : 'not_configured',
    lastError: null,
  };
};

module.exports = {
  createRedisClient,
  initRedis,
  getRedisClient,
  getRedisStatus,
  closeRedis,
  sanitizeRedisErrorMessage,
};
