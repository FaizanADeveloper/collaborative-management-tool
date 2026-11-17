const express = require('express');
const request = require('supertest');
const EventEmitter = require('events');

class MockRedisClientForRateLimiter extends EventEmitter {
  constructor() {
    super();
    this.status = 'wait';
    this.storage = new Map();
  }

  async call(cmd, ...args) {
    if (this.status !== 'ready') {
      throw new Error('Connection closed');
    }

    // Emulate Redis commands for rate-limit-redis Lua script
    if (cmd === 'SCRIPT' && args[0] === 'LOAD') {
      return 'mock_sha_123';
    }

    if (cmd === 'EVALSHA' || cmd === 'EVAL') {
      // In rate-limit-redis increment script:
      // args: [sha, 1, key, windowMs, max, now]
      const key = args[2] || args[1];
      const now = Date.now();
      let record = this.storage.get(key);
      if (!record || record.resetTime <= now) {
        record = { hits: 1, resetTime: now + 60000 };
      } else {
        record.hits += 1;
      }
      this.storage.set(key, record);
      return [record.hits, record.resetTime - now];
    }

    if (cmd === 'DEL') {
      for (const k of args) {
        this.storage.delete(k);
      }
      return args.length;
    }

    return 'OK';
  }
}

let mockActiveClient = null;

jest.mock('../src/redis/client', () => {
  const original = jest.requireActual('../src/redis/client');
  return {
    ...original,
    getRedisClient: jest.fn(() => mockActiveClient),
  };
});

const {
  HybridRateLimitStore,
  createRateLimiter,
  authLimiter,
  mutationLimiter,
} = require('../src/middleware/rateLimiter');

describe('Milestone E & Blocker 2: Redis-Backed Rate Limiting & Lifecycle', () => {
  let app;

  beforeEach(() => {
    mockActiveClient = null;
    app = express();
    app.use(express.json());
  });

  it('allows requests within limit and exposes standard RateLimit headers', async () => {
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 5,
      prefix: 'flowdesk:test:rl1:',
    });

    app.get('/test-limit', limiter, (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test-limit');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });

  it('throttles with HTTP 429 and standardized Flowdesk JSON error when limit is exceeded', async () => {
    const env = require('../src/config/env');
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';

    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 2,
      message: 'Too many requests for test endpoint.',
      prefix: 'flowdesk:test:rl2:',
    });

    app.get('/test-throttle', limiter, (req, res) => res.json({ ok: true }));

    await request(app).get('/test-throttle');
    await request(app).get('/test-throttle');

    const res = await request(app).get('/test-throttle');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      status: 'fail',
      message: 'Too many requests for test endpoint.',
    });

    env.NODE_ENV = originalEnv;
  });

  describe('Lifecycle & Dynamic Redis Transition', () => {
    it('operates in memory store before Redis is initialized, then switches to RedisStore once ready', async () => {
      // 1. Limiter created before Redis is initialized
      const store = new HybridRateLimitStore({ prefix: 'flowdesk:test:dyn:' });
      store.init({ windowMs: 60000 });

      // Active client is null -> memory mode
      expect(store.currentStoreMode).toBe('memory');
      const resMem = await store.increment('client_ip_1');
      expect(resMem.totalHits).toBe(1);
      expect(store.currentStoreMode).toBe('memory');

      // 2. Redis becomes available and ready
      mockActiveClient = new MockRedisClientForRateLimiter();
      mockActiveClient.status = 'ready';

      // Next request should transition to Redis
      const resRedis = await store.increment('client_ip_1');
      expect(resRedis.totalHits).toBe(1); // Redis has its own shared counter starting at 1
      expect(store.currentStoreMode).toBe('redis');
    });

    it('coordinates shared counters across two independent application instances using Redis', async () => {
      // Simulate shared Redis database between Instance 1 and Instance 2
      const sharedMockRedis = new MockRedisClientForRateLimiter();
      sharedMockRedis.status = 'ready';
      mockActiveClient = sharedMockRedis;

      // Instance 1 limiter
      const storeInstance1 = new HybridRateLimitStore({ prefix: 'flowdesk:test:shared:' });
      storeInstance1.init({ windowMs: 60000 });

      // Instance 2 limiter
      const storeInstance2 = new HybridRateLimitStore({ prefix: 'flowdesk:test:shared:' });
      storeInstance2.init({ windowMs: 60000 });

      // Instance 1 receives hit 1
      const hit1 = await storeInstance1.increment('shared_ip_A');
      expect(hit1.totalHits).toBe(1);

      // Instance 2 receives hit 2 for the same IP
      const hit2 = await storeInstance2.increment('shared_ip_A');
      expect(hit2.totalHits).toBe(2);

      // Instance 1 receives hit 3
      const hit3 = await storeInstance1.increment('shared_ip_A');
      expect(hit3.totalHits).toBe(3);
    });

    it('falls back gracefully to memory store during Redis mid-flight outage and recovers on reconnect', async () => {
      const mockRedis = new MockRedisClientForRateLimiter();
      mockRedis.status = 'ready';
      mockActiveClient = mockRedis;

      const store = new HybridRateLimitStore({ prefix: 'flowdesk:test:outage:' });
      store.init({ windowMs: 60000 });

      const hit1 = await store.increment('outage_ip');
      expect(hit1.totalHits).toBe(1);
      expect(store.currentStoreMode).toBe('redis');

      // Redis drops connection
      mockRedis.status = 'close';

      // Next request should fall back to memory without throwing
      const hit2 = await store.increment('outage_ip');
      expect(hit2.totalHits).toBeGreaterThanOrEqual(1);
      expect(store.currentStoreMode).toBe('memory');

      // Redis reconnects
      mockRedis.status = 'ready';

      // Next request resumes using RedisStore
      const hit3 = await store.increment('outage_ip');
      expect(hit3.totalHits).toBe(2);
      expect(store.currentStoreMode).toBe('redis');
    });
  });

  describe('Pre-configured Endpoints', () => {
    it('exports authLimiter and mutationLimiter with valid middleware signatures', () => {
      expect(typeof authLimiter).toBe('function');
      expect(typeof mutationLimiter).toBe('function');
      expect(authLimiter.getStore()).toBeInstanceOf(HybridRateLimitStore);
      expect(mutationLimiter.getStore()).toBeInstanceOf(HybridRateLimitStore);
    });
  });
});
