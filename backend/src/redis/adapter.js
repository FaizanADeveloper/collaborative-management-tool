const { createAdapter } = require('@socket.io/redis-adapter');
const { createRedisClient, sanitizeRedisErrorMessage } = require('./client');
const env = require('../config/env');

let pubClientInstance = null;
let subClientInstance = null;

let adapterStatus = {
  mode: 'in_memory',
  status: env.REDIS_URL ? 'uninitialized' : 'not_configured',
  error: null,
};

/**
 * Initializes and attaches the Socket.IO Redis adapter to the given Server instance.
 * Creates dedicated publisher and subscriber clients with ioredis.
 * Falls back safely to in-memory adapter if Redis is unconfigured or unavailable.
 *
 * @param {import('socket.io').Server} io
 * @returns {Promise<{ mode: string, status: string, error?: string }>}
 */
const initSocketAdapter = async (io) => {
  if (!env.REDIS_URL) {
    adapterStatus = {
      mode: 'in_memory',
      status: 'not_configured',
      error: null,
    };
    return adapterStatus;
  }

  // Prevent duplicate adapter attachments
  if (pubClientInstance && subClientInstance && adapterStatus.status === 'ready') {
    return adapterStatus;
  }

  try {
    pubClientInstance = createRedisClient({
      maxRetriesPerRequest: null, // Required by pub/sub clients in ioredis
    });

    if (!pubClientInstance) {
      adapterStatus = {
        mode: 'in_memory',
        status: 'not_configured',
        error: null,
      };
      return adapterStatus;
    }

    subClientInstance = pubClientInstance.duplicate();

    // Connect publisher and subscriber clients in parallel
    await Promise.all([
      pubClientInstance.connect(),
      subClientInstance.connect(),
    ]);

    const adapter = createAdapter(pubClientInstance, subClientInstance);
    io.adapter(adapter);

    adapterStatus = {
      mode: 'redis',
      status: 'ready',
      error: null,
    };

    if (env.NODE_ENV !== 'test') {
      console.log('[Socket.IO] Redis adapter mounted successfully for cross-instance events.');
    }

    return adapterStatus;
  } catch (err) {
    const safeError = sanitizeRedisErrorMessage(err?.message || 'Failed to initialize Redis adapter');
    adapterStatus = {
      mode: 'in_memory',
      status: 'fallback',
      error: safeError,
    };

    if (env.NODE_ENV !== 'test') {
      console.warn(`[Socket.IO] Redis adapter error, falling back to in-memory adapter: ${safeError}`);
    }

    await closeSocketAdapter({ preserveStatus: true });
    return adapterStatus;
  }
};

/**
 * Returns safe adapter operational status.
 *
 * @returns {{ mode: string, status: string, error?: string }}
 */
const getAdapterStatus = () => ({ ...adapterStatus });

/**
 * Closes the dedicated pub/sub adapter Redis clients gracefully.
 *
 * @param {{ preserveStatus?: boolean }} [options={}]
 * @returns {Promise<void>}
 */
const closeSocketAdapter = async (options = {}) => {
  const clients = [pubClientInstance, subClientInstance].filter(Boolean);
  pubClientInstance = null;
  subClientInstance = null;

  await Promise.all(
    clients.map(async (client) => {
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

  if (!options.preserveStatus) {
    adapterStatus = {
      mode: 'in_memory',
      status: env.REDIS_URL ? 'closed' : 'not_configured',
      error: null,
    };
  }
};

module.exports = {
  initSocketAdapter,
  getAdapterStatus,
  closeSocketAdapter,
};
