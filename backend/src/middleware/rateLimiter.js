const { rateLimit, MemoryStore } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../redis/client');
const env = require('../config/env');

/**
 * Hybrid dual-mode RateLimit store.
 *
 * Dynamically routes counter operations to RedisStore when Redis is initialized and ready,
 * and cleanly falls back to an internal MemoryStore during pre-initialization or outages.
 */
class HybridRateLimitStore {
  constructor({ prefix = 'flowdesk:rl:' } = {}) {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
    this.redisStore = null;
    this.options = null;
    this.currentStoreMode = 'memory';
  }

  init(options) {
    this.options = options;
    this.memoryStore.init(options);
  }

  /**
   * Lazily provisions and returns the RedisStore instance when the Redis client is ready.
   *
   * @returns {import('rate-limit-redis').RedisStore|null}
   */
  getRedisStore() {
    const client = getRedisClient();
    if (client && client.status === 'ready') {
      if (!this.redisStore) {
        try {
          this.redisStore = new RedisStore({
            sendCommand: (...args) => client.call(...args),
            prefix: this.prefix,
          });
          if (this.options) {
            this.redisStore.init(this.options);
          }
        } catch (_) {
          this.redisStore = null;
          this.currentStoreMode = 'memory';
          return null;
        }
      }
      this.currentStoreMode = 'redis';
      return this.redisStore;
    }

    this.redisStore = null;
    this.currentStoreMode = 'memory';
    return null;
  }

  async get(key) {
    const rStore = this.getRedisStore();
    if (rStore) {
      try {
        return await rStore.get(key);
      } catch (_) {}
    }
    return this.memoryStore.get(key);
  }

  async increment(key) {
    const rStore = this.getRedisStore();
    if (rStore) {
      try {
        return await rStore.increment(key);
      } catch (_) {
        this.redisStore = null;
        this.currentStoreMode = 'memory';
        return this.memoryStore.increment(key);
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key) {
    const rStore = this.getRedisStore();
    if (rStore) {
      try {
        return await rStore.decrement(key);
      } catch (_) {}
    }
    return this.memoryStore.decrement(key);
  }

  async resetKey(key) {
    const rStore = this.getRedisStore();
    if (rStore) {
      try {
        await rStore.resetKey(key);
      } catch (_) {}
    }
    return this.memoryStore.resetKey(key);
  }

  async resetAll() {
    if (typeof this.memoryStore.resetAll === 'function') {
      await this.memoryStore.resetAll();
    }
    this.redisStore = null;
  }
}

/**
 * Creates an Express rate limiter backed by HybridRateLimitStore.
 *
 * @param {object} [options={}]
 * @param {number} [options.windowMs]
 * @param {number} [options.max]
 * @param {string} [options.message]
 * @param {string} [options.prefix]
 * @returns {import('express').RequestHandler}
 */
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests, please try again later.',
  prefix = 'flowdesk:rl:',
} = {}) => {
  const effectiveMax = env.NODE_ENV === 'test' ? 2000 : max;
  const store = new HybridRateLimitStore({ prefix });

  const limiter = rateLimit({
    windowMs,
    limit: effectiveMax,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    store,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        status: 'fail',
        message,
      });
    },
  });

  limiter.getStore = () => store;
  limiter.getStoreMode = () => store.currentStoreMode;

  return limiter;
};

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  prefix: 'flowdesk:rl:auth:',
});

const mutationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please slow down and try again later.',
  prefix: 'flowdesk:rl:mutate:',
});

module.exports = {
  HybridRateLimitStore,
  createRateLimiter,
  authLimiter,
  mutationLimiter,
};
