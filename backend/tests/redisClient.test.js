const EventEmitter = require('events');

class MockRedis extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.options = options;
    this.status = options.lazyConnect ? 'wait' : 'ready';
  }

  async connect() {
    this.status = 'ready';
    this.emit('connect');
    this.emit('ready');
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  async quit() {
    this.status = 'closed';
    this.emit('close');
    this.emit('end');
    return 'OK';
  }

  disconnect() {
    this.status = 'closed';
    this.emit('close');
    this.emit('end');
  }

  duplicate(options = {}) {
    return new MockRedis(this.url, { ...this.options, ...options });
  }
}

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation((url, opts) => new MockRedis(url, opts));
});

const {
  createRedisClient,
  initRedis,
  getRedisClient,
  getRedisStatus,
  closeRedis,
  sanitizeRedisErrorMessage,
} = require('../src/redis/client');

describe('Milestone A: Redis Client & Connection Infrastructure', () => {
  afterEach(async () => {
    await closeRedis();
  });

  describe('Sanitization & Safe Status Reporting', () => {
    it('sanitizes connection URLs containing credentials from error messages', () => {
      const rawError = 'Connection failed to redis://default:SuperSecretPassword123@redis-123.c1.us-east-1.redns.redis-cloud.com:12345';
      const sanitized = sanitizeRedisErrorMessage(rawError);
      expect(sanitized).not.toContain('SuperSecretPassword123');
      expect(sanitized).toContain('redis://<credentials>@redis-123.c1.us-east-1.redns.redis-cloud.com:12345');
    });

    it('returns not_configured status when REDIS_URL is falsy', () => {
      const env = require('../src/config/env');
      const originalUrl = env.REDIS_URL;
      env.REDIS_URL = '';

      const status = getRedisStatus();
      expect(status.configured).toBe(false);
      expect(status.status).toBe('not_configured');
      expect(status.mode).toBe('in_memory_fallback');

      env.REDIS_URL = originalUrl;
    });

    it('returns null from createRedisClient when REDIS_URL is falsy', () => {
      const env = require('../src/config/env');
      const originalUrl = env.REDIS_URL;
      env.REDIS_URL = '';

      const client = createRedisClient();
      expect(client).toBeNull();

      env.REDIS_URL = originalUrl;
    });
  });

  describe('Lifecycle and Duplicate Initialization Prevention', () => {
    it('initializes a primary client when configured and prevents duplicate connections', async () => {
      const env = require('../src/config/env');
      const originalUrl = env.REDIS_URL;
      env.REDIS_URL = 'redis://default:dummy@127.0.0.1:6379';

      const client1 = await initRedis();
      expect(client1).not.toBeNull();
      expect(getRedisClient()).toBe(client1);

      const client2 = await initRedis();
      expect(client2).toBe(client1);

      const status = getRedisStatus();
      expect(status.configured).toBe(true);
      expect(status.status).toBe('ready');
      expect(status.mode).toBe('redis');

      env.REDIS_URL = originalUrl;
    });

    it('gracefully closes clients and updates status to closed or not_configured', async () => {
      await closeRedis();
      expect(getRedisClient()).toBeNull();
      const status = getRedisStatus();
      expect(['closed', 'not_configured']).toContain(status.status);
    });
  });
});
