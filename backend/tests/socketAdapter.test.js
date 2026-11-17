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

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn().mockReturnValue((nsp) => ({
    init: jest.fn(),
    close: jest.fn(),
    broadcast: jest.fn(),
    nsp,
  })),
}));

const {
  initSocketAdapter,
  getAdapterStatus,
  closeSocketAdapter,
} = require('../src/redis/adapter');

describe('Milestone B: Socket.IO Redis Adapter & Lifecycle', () => {
  let mockIo;

  beforeEach(() => {
    mockIo = {
      adapter: jest.fn(),
    };
  });

  afterEach(async () => {
    await closeSocketAdapter();
  });

  it('falls back to in-memory adapter when REDIS_URL is not configured', async () => {
    const env = require('../src/config/env');
    const originalUrl = env.REDIS_URL;
    env.REDIS_URL = '';

    const status = await initSocketAdapter(mockIo);
    expect(status.mode).toBe('in_memory');
    expect(status.status).toBe('not_configured');
    expect(mockIo.adapter).not.toHaveBeenCalled();

    env.REDIS_URL = originalUrl;
  });

  it('initializes redis adapter and attaches to io when REDIS_URL is present', async () => {
    const env = require('../src/config/env');
    const originalUrl = env.REDIS_URL;
    env.REDIS_URL = 'redis://default:mock@127.0.0.1:6379';

    const status = await initSocketAdapter(mockIo);
    expect(status.mode).toBe('redis');
    expect(status.status).toBe('ready');
    expect(mockIo.adapter).toHaveBeenCalledTimes(1);

    const currentStatus = getAdapterStatus();
    expect(currentStatus.mode).toBe('redis');
    expect(currentStatus.status).toBe('ready');

    env.REDIS_URL = originalUrl;
  });

  it('prevents attaching duplicate adapters if already ready', async () => {
    const env = require('../src/config/env');
    const originalUrl = env.REDIS_URL;
    env.REDIS_URL = 'redis://default:mock@127.0.0.1:6379';

    await initSocketAdapter(mockIo);
    expect(mockIo.adapter).toHaveBeenCalledTimes(1);

    // Second call should return existing status without re-attaching
    await initSocketAdapter(mockIo);
    expect(mockIo.adapter).toHaveBeenCalledTimes(1);

    env.REDIS_URL = originalUrl;
  });

  it('gracefully handles client connection failure by falling back to in-memory', async () => {
    const env = require('../src/config/env');
    const originalUrl = env.REDIS_URL;
    env.REDIS_URL = 'redis://default:mock@127.0.0.1:6379';

    const Redis = require('ioredis');
    Redis.mockImplementationOnce(() => {
      const failingClient = new MockRedis('redis://...');
      failingClient.connect = jest.fn().mockRejectedValue(new Error('Connection refused'));
      return failingClient;
    });

    const status = await initSocketAdapter(mockIo);
    expect(status.mode).toBe('in_memory');
    expect(status.status).toBe('fallback');
    expect(status.error).toContain('Connection refused');

    env.REDIS_URL = originalUrl;
  });

  it('gracefully cleans up pub/sub clients on closeSocketAdapter', async () => {
    await closeSocketAdapter();
    const status = getAdapterStatus();
    expect(['closed', 'not_configured']).toContain(status.status);
  });
});
