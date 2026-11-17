const EventEmitter = require('events');

class MockRedisWithPresenceLeases extends EventEmitter {
  constructor() {
    super();
    this.status = 'ready';
    this.hashes = new Map();
    this.keysMap = new Map();
  }

  async hget(key, field) {
    const hash = this.hashes.get(key);
    return hash?.get(field) || null;
  }

  async hgetall(key) {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    const obj = {};
    for (const [k, v] of hash.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  async hset(key, field, value) {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    this.hashes.get(key).set(field, value);
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

  async get(key) {
    return this.keysMap.get(key) || null;
  }

  async set(key, value) {
    this.keysMap.set(key, value);
    return 'OK';
  }

  async del(...keys) {
    for (const k of keys) {
      this.keysMap.delete(k);
      this.hashes.delete(k);
    }
    return keys.length;
  }

  async expire() {
    return 1;
  }

  async eval(script, numkeys, ...args) {
    // 1. PRUNE AND GET SCRIPT
    if (script.includes('local raw = redis.call(\'HGETALL\', KEYS[1])') && script.includes('local totalActiveUsers = 0')) {
      const boardKey = args[0];
      const nowNum = Number(args[1]);
      const leaseMsNum = Number(args[2]);

      const hash = this.hashes.get(boardKey);
      if (!hash || hash.size === 0) {
        return JSON.stringify([]);
      }

      const collabs = [];
      let totalActiveUsers = 0;

      for (const [uid, recordJson] of Array.from(hash.entries())) {
        const record = JSON.parse(recordJson);
        const activeSockets = {};
        let activeCount = 0;

        if (record && record.sockets) {
          for (const [sid, lastHb] of Object.entries(record.sockets)) {
            if (nowNum - Number(lastHb) <= leaseMsNum) {
              activeSockets[sid] = Number(lastHb);
              activeCount++;
            }
          }
        }

        if (activeCount === 0) {
          hash.delete(uid);
        } else {
          totalActiveUsers++;
          record.sockets = activeSockets;
          hash.set(uid, JSON.stringify(record));
          if (record.user) collabs.push(record.user);
        }
      }

      if (totalActiveUsers === 0) {
        this.hashes.delete(boardKey);
      }

      return JSON.stringify(collabs);
    }

    // 2. JOIN SCRIPT
    if (script.includes('local nowNum = tonumber(ARGV[4])') && script.includes('isFirst = 1')) {
      const boardKey = args[0];
      const socketKey = args[1];
      const userId = args[2];
      const socketId = args[3];
      const userJson = args[4];
      const nowNum = Number(args[5]);
      const leaseMsNum = Number(args[6]);
      const boardId = args[7];

      let isFirst = 1;
      let hash = this.hashes.get(boardKey);
      if (!hash) {
        hash = new Map();
        this.hashes.set(boardKey, hash);
      }

      // Prune stale sockets across the board
      for (const [uid, rJson] of Array.from(hash.entries())) {
        const r = JSON.parse(rJson);
        const active = {};
        let count = 0;
        if (r && r.sockets) {
          for (const [sid, lastHb] of Object.entries(r.sockets)) {
            if (nowNum - Number(lastHb) <= leaseMsNum) {
              active[sid] = Number(lastHb);
              count++;
            }
          }
        }
        if (count === 0) {
          hash.delete(uid);
        } else {
          r.sockets = active;
          hash.set(uid, JSON.stringify(r));
          if (uid === userId) isFirst = 0;
        }
      }

      let userRec = hash.get(userId) ? JSON.parse(hash.get(userId)) : null;
      if (userRec) {
        if (!userRec.sockets) userRec.sockets = {};
        userRec.sockets[socketId] = nowNum;
        userRec.user = JSON.parse(userJson);
        userRec.boardId = boardId;
      } else {
        isFirst = 1;
        userRec = {
          user: JSON.parse(userJson),
          boardId,
          sockets: { [socketId]: nowNum },
          joinedAt: nowNum,
        };
      }

      hash.set(userId, JSON.stringify(userRec));
      this.keysMap.set(socketKey, JSON.stringify({ userId, boardId, lastHeartbeat: nowNum }));

      const activeCollabs = [];
      for (const val of hash.values()) {
        const r = JSON.parse(val);
        if (r && r.user) activeCollabs.push(r.user);
      }

      return [isFirst, JSON.stringify(activeCollabs)];
    }

    // 3. LEAVE SCRIPT
    if (script.includes('local existing = redis.call(\'HGET\', KEYS[1], ARGV[1])') && script.includes('isLast = 0')) {
      const boardKey = args[0];
      const socketKey = args[1];
      const userId = args[2];
      const socketId = args[3];
      const nowNum = Number(args[4] || Date.now());
      const leaseMsNum = Number(args[5] || 60000);

      let isLast = 0;
      const hash = this.hashes.get(boardKey);
      if (hash && hash.has(userId)) {
        const record = JSON.parse(hash.get(userId));
        const remainingSockets = {};
        let activeCount = 0;

        if (record && record.sockets) {
          for (const [sid, lastHb] of Object.entries(record.sockets)) {
            if (sid !== socketId && (nowNum - Number(lastHb)) <= leaseMsNum) {
              remainingSockets[sid] = Number(lastHb);
              activeCount++;
            }
          }
        }

        if (activeCount === 0) {
          isLast = 1;
          hash.delete(userId);
          if (hash.size === 0) {
            this.hashes.delete(boardKey);
          }
        } else {
          record.sockets = remainingSockets;
          hash.set(userId, JSON.stringify(record));
        }
      } else {
        isLast = 1;
      }

      this.keysMap.delete(socketKey);
      return isLast;
    }

    // 4. HEARTBEAT SCRIPT
    if (script.includes("local nowNum = tonumber(ARGV[3])") && script.includes("ARGV[5]")) {
      const boardKey = args[0];
      const socketKey = args[1];
      const userId = args[2];
      const socketId = args[3];
      const nowNum = Number(args[4]);
      const leaseMsNum = Number(args[5]);
      const boardId = args[6];

      const hash = this.hashes.get(boardKey);
      if (!hash || !hash.has(userId)) return 0;

      const record = JSON.parse(hash.get(userId));
      if (!record.sockets) record.sockets = {};

      const active = {};
      for (const [sid, lastHb] of Object.entries(record.sockets)) {
        if ((nowNum - Number(lastHb)) <= leaseMsNum || sid === socketId) {
          active[sid] = (sid === socketId) ? nowNum : Number(lastHb);
        }
      }

      record.sockets = active;
      hash.set(userId, JSON.stringify(record));
      this.keysMap.set(socketKey, JSON.stringify({ userId, boardId, lastHeartbeat: nowNum }));
      return 1;
    }

    return null;
  }
}

const mockRedis = new MockRedisWithPresenceLeases();
jest.mock('../src/redis/client', () => {
  const original = jest.requireActual('../src/redis/client');
  return {
    ...original,
    getRedisClient: jest.fn(() => mockRedis),
  };
});

const {
  trackBoardJoin,
  renewSocketHeartbeat,
  trackBoardLeave,
  handleSocketDisconnect,
  getBoardCollaborators,
  clearPresence,
  PRESENCE_LEASE_MS,
} = require('../src/redis/presence');

describe('Milestone C & Blocker 1: Distributed Presence & Crash Recovery Leases', () => {
  const boardId = '654321654321654321654321';
  const boardId2 = '654321654321654321654322';
  const userA = { id: 'user_111111111111111111111', name: 'User A', avatar: 'https://example.com/a.png' };
  const userB = { id: 'user_222222222222222222222', name: 'User B', avatar: '' };

  beforeEach(async () => {
    await clearPresence();
    mockRedis.hashes.clear();
    mockRedis.keysMap.clear();
  });

  it('tracks initial socket join and returns collaborator snapshot with isFirstSocketForUser=true', async () => {
    const socket = {
      id: 'sock_A1',
      data: { user: userA, userId: userA.id },
    };

    const res = await trackBoardJoin(socket, boardId);
    expect(res.isFirstSocketForUser).toBe(true);
    expect(res.user.id).toBe(userA.id);
    expect(res.collaborators).toHaveLength(1);
    expect(res.collaborators[0].id).toBe(userA.id);

    if (socket._presenceHeartbeatInterval) {
      clearInterval(socket._presenceHeartbeatInterval);
    }
  });

  it('deduplicates multiple tabs for the same user and manages leases per socket', async () => {
    const socketTab1 = {
      id: 'sock_A_tab1',
      data: { user: userA, userId: userA.id },
    };
    const socketTab2 = {
      id: 'sock_A_tab2',
      data: { user: userA, userId: userA.id },
    };

    const res1 = await trackBoardJoin(socketTab1, boardId);
    expect(res1.isFirstSocketForUser).toBe(true);
    expect(res1.collaborators).toHaveLength(1);

    const res2 = await trackBoardJoin(socketTab2, boardId);
    expect(res2.isFirstSocketForUser).toBe(false);
    expect(res2.collaborators).toHaveLength(1); // User appears once

    // Tab 1 closes -> user remains present
    const leave1 = await trackBoardLeave(socketTab1, boardId);
    expect(leave1.isLastSocketForUser).toBe(false);

    const collabs = await getBoardCollaborators(boardId);
    expect(collabs).toHaveLength(1);
    expect(collabs[0].id).toBe(userA.id);

    // Tab 2 closes -> final socket -> user removed and board key deleted
    const leave2 = await trackBoardLeave(socketTab2, boardId);
    expect(leave2.isLastSocketForUser).toBe(true);

    const collabsAfter = await getBoardCollaborators(boardId);
    expect(collabsAfter).toHaveLength(0);
    expect(mockRedis.hashes.has(`flowdesk:presence:board:${boardId}`)).toBe(false);

    if (socketTab1._presenceHeartbeatInterval) clearInterval(socketTab1._presenceHeartbeatInterval);
    if (socketTab2._presenceHeartbeatInterval) clearInterval(socketTab2._presenceHeartbeatInterval);
  });

  describe('Node.js Crash Recovery Scenario', () => {
    it('detects and prunes stale sockets after Node instance A terminates abruptly without disconnect handlers', async () => {
      const now = Date.now();
      const boardKey = `flowdesk:presence:board:${boardId}`;

      // Simulate User A from crashed Node instance A with a stale socket (75 seconds old, lease expired)
      const crashedUserA = {
        user: userA,
        boardId,
        sockets: { 'sock_crashed_instance_A': now - 75000 },
        joinedAt: now - 75000,
      };

      // Simulate User B from healthy Node instance B with an active socket (10 seconds old)
      const healthyUserB = {
        user: userB,
        boardId,
        sockets: { 'sock_healthy_instance_B': now - 10000 },
        joinedAt: now - 10000,
      };

      await mockRedis.hset(boardKey, userA.id, JSON.stringify(crashedUserA));
      await mockRedis.hset(boardKey, userB.id, JSON.stringify(healthyUserB));

      // Node instance B queries active collaborators
      const collaborators = await getBoardCollaborators(boardId);

      // Verify User A was pruned and User B was retained
      expect(collaborators).toHaveLength(1);
      expect(collaborators[0].id).toBe(userB.id);

      // Verify Redis hash no longer contains User A
      const rawHash = await mockRedis.hgetall(boardKey);
      expect(rawHash[userA.id]).toBeUndefined();
      expect(rawHash[userB.id]).toBeDefined();
    });

    it('multi-tab crash recovery: retains user if a second tab is still active when the first tab crashes', async () => {
      const now = Date.now();
      const boardKey = `flowdesk:presence:board:${boardId}`;

      // User A had Tab 1 on crashed instance A (expired 70s ago) and Tab 2 on healthy instance B (active 10s ago)
      const multiTabUserA = {
        user: userA,
        boardId,
        sockets: {
          'sock_tab1_crashed': now - 70000,
          'sock_tab2_healthy': now - 10000,
        },
        joinedAt: now - 70000,
      };

      await mockRedis.hset(boardKey, userA.id, JSON.stringify(multiTabUserA));

      const collaborators = await getBoardCollaborators(boardId);
      // User A is still visible because Tab 2 is active
      expect(collaborators).toHaveLength(1);
      expect(collaborators[0].id).toBe(userA.id);

      // In the Redis record, sock_tab1_crashed has been pruned while sock_tab2_healthy remains
      const updatedRecord = JSON.parse(await mockRedis.hget(boardKey, userA.id));
      expect(updatedRecord.sockets['sock_tab1_crashed']).toBeUndefined();
      expect(updatedRecord.sockets['sock_tab2_healthy']).toBeDefined();
    });

    it('prunes all crashed users and removes empty board presence key when all instances crash', async () => {
      const now = Date.now();
      const boardKey = `flowdesk:presence:board:${boardId}`;

      const crashedUserA = {
        user: userA,
        boardId,
        sockets: { 'sock_crashed': now - 80000 },
        joinedAt: now - 80000,
      };

      await mockRedis.hset(boardKey, userA.id, JSON.stringify(crashedUserA));

      const collaborators = await getBoardCollaborators(boardId);
      expect(collaborators).toHaveLength(0);
      expect(mockRedis.hashes.has(boardKey)).toBe(false);
    });
  });

  describe('Heartbeat Lease Renewal', () => {
    it('renews only the active socket lease without affecting peer socket timestamps', async () => {
      const socket1 = { id: 'sock_userA_1', data: { user: userA, userId: userA.id } };
      const socket2 = { id: 'sock_userA_2', data: { user: userA, userId: userA.id } };

      await trackBoardJoin(socket1, boardId);
      await trackBoardJoin(socket2, boardId);

      const renewed = await renewSocketHeartbeat(socket1, boardId);
      expect(renewed).toBe(true);

      if (socket1._presenceHeartbeatInterval) clearInterval(socket1._presenceHeartbeatInterval);
      if (socket2._presenceHeartbeatInterval) clearInterval(socket2._presenceHeartbeatInterval);
    });
  });
});
