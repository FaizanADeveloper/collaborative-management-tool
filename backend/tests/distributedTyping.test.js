const EventEmitter = require('events');

class MockRedisWithTyping extends EventEmitter {
  constructor() {
    super();
    this.status = 'ready';
    this.hashes = new Map();
  }

  async hset(key, field, val) {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    this.hashes.get(key).set(field, val);
    return 1;
  }

  async hdel(key, field) {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    const deleted = hash.delete(field);
    if (hash.size === 0) {
      this.hashes.delete(key);
    }
    return deleted ? 1 : 0;
  }

  async hkeys(key) {
    const hash = this.hashes.get(key);
    if (!hash) return [];
    return Array.from(hash.keys());
  }

  async expire() {
    return 1;
  }
}

const mockRedis = new MockRedisWithTyping();
jest.mock('../src/redis/client', () => {
  const original = jest.requireActual('../src/redis/client');
  return {
    ...original,
    getRedisClient: jest.fn(() => mockRedis),
  };
});

const {
  setCardTypingStatus,
  isUserTypingDistributed,
} = require('../src/redis/typing');

describe('Milestone D: Distributed Card Typing Indicators', () => {
  const boardId = '654321654321654321654321';
  const cardId = '654321654321654321654329';
  const userId = 'user_alex_12345';

  beforeEach(() => {
    mockRedis.hashes.clear();
  });

  it('registers typing status in Redis with short TTL', async () => {
    await setCardTypingStatus(boardId, cardId, userId, 'socket_tab1', true);

    const key = `flowdesk:typing:board:${boardId}:card:${cardId}`;
    const hash = mockRedis.hashes.get(key);
    expect(hash).toBeDefined();
    expect(hash.has(`${userId}:socket_tab1`)).toBe(true);
  });

  it('detects when another tab of the same user is still typing after one stops', async () => {
    // Both tabs start typing
    await setCardTypingStatus(boardId, cardId, userId, 'socket_tab1', true);
    await setCardTypingStatus(boardId, cardId, userId, 'socket_tab2', true);

    // Tab 1 stops
    await setCardTypingStatus(boardId, cardId, userId, 'socket_tab1', false);

    // Check if user is still typing from any socket other than socket_tab1
    const stillTyping = await isUserTypingDistributed(boardId, cardId, userId, 'socket_tab1');
    expect(stillTyping).toBe(true);

    // Tab 2 stops
    await setCardTypingStatus(boardId, cardId, userId, 'socket_tab2', false);

    // Check again
    const finalTyping = await isUserTypingDistributed(boardId, cardId, userId, 'socket_tab2');
    expect(finalTyping).toBe(false);
  });

  it('removes keys cleanly when all sockets stop typing', async () => {
    await setCardTypingStatus(boardId, cardId, userId, 'socket_tab1', true);
    await setCardTypingStatus(boardId, cardId, userId, 'socket_tab1', false);

    const key = `flowdesk:typing:board:${boardId}:card:${cardId}`;
    expect(mockRedis.hashes.has(key)).toBe(false);
  });
});
