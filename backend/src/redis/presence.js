/**
 * Distributed Collaborator Presence Service for Flowdesk.
 *
 * Implements per-socket heartbeat leases, atomic Redis Lua crash recovery,
 * multi-tab deduplication, and seamless in-memory fallback.
 */

const { getRedisClient } = require('./client');

const PRESENCE_BOARD_PREFIX = 'flowdesk:presence:board:';
const PRESENCE_SOCKET_PREFIX = 'flowdesk:presence:socket:';

// 60-second lease window; socket heartbeats refresh every 20 seconds
const PRESENCE_LEASE_MS = 60 * 1000;
const PRESENCE_HEARTBEAT_INTERVAL_MS = 20 * 1000;

// In-memory fallback registries
const localBoardPresence = new Map();
const localSocketTracking = new Map();

/**
 * Strips sensitive data from user objects, returning minimal presence fields.
 *
 * @param {object} rawUser
 * @returns {{ id: string, name: string, avatar: string }|null}
 */
const sanitizePresenceUser = (rawUser) => {
  if (!rawUser || typeof rawUser !== 'object') return null;
  const id = rawUser.id || rawUser._id;
  if (!id) return null;

  return {
    id: String(id),
    name:
      typeof rawUser.name === 'string' && rawUser.name.trim()
        ? rawUser.name.trim()
        : 'User',
    avatar: typeof rawUser.avatar === 'string' ? rawUser.avatar.trim() : '',
  };
};

/**
 * Lua script for atomic join on a board.
 * Prunes expired sockets across the board first so stale records are never resurrected.
 * KEYS[1] = boardKey
 * KEYS[2] = socketKey
 * ARGV[1] = userId
 * ARGV[2] = socketId
 * ARGV[3] = userJson
 * ARGV[4] = now (timestamp ms)
 * ARGV[5] = leaseMs (e.g. 60000)
 * ARGV[6] = boardId
 */
const JOIN_LUA_SCRIPT = `
local nowNum = tonumber(ARGV[4])
local leaseMsNum = tonumber(ARGV[5])
local isFirst = 1

-- 1. Prune all stale sockets on this board first
local raw = redis.call('HGETALL', KEYS[1])
for i = 1, #raw, 2 do
    local uid = raw[i]
    local record = cjson.decode(raw[i+1])
    local activeSockets = {}
    local activeCount = 0

    if record and record.sockets then
        for sid, lastHb in pairs(record.sockets) do
            if (nowNum - tonumber(lastHb)) <= leaseMsNum then
                activeSockets[sid] = lastHb
                activeCount = activeCount + 1
            end
        end
    end

    if activeCount == 0 then
        redis.call('HDEL', KEYS[1], uid)
    else
        record.sockets = activeSockets
        redis.call('HSET', KEYS[1], uid, cjson.encode(record))
        if uid == ARGV[1] then
            isFirst = 0
        end
    end
end

-- 2. Add or update current socket for target user
local existingUserRecord = redis.call('HGET', KEYS[1], ARGV[1])
local userRec = {}
if existingUserRecord and existingUserRecord ~= '' then
    userRec = cjson.decode(existingUserRecord)
    if not userRec.sockets then userRec.sockets = {} end
    userRec.sockets[ARGV[2]] = nowNum
    userRec.user = cjson.decode(ARGV[3])
    userRec.boardId = ARGV[6]
else
    isFirst = 1
    userRec = {
        user = cjson.decode(ARGV[3]),
        boardId = ARGV[6],
        sockets = { [ARGV[2]] = nowNum },
        joinedAt = nowNum
    }
end

redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(userRec))

local ttlSeconds = math.ceil((leaseMsNum * 2) / 1000)
redis.call('EXPIRE', KEYS[1], ttlSeconds)

local socketData = {
    userId = ARGV[1],
    boardId = ARGV[6],
    lastHeartbeat = nowNum
}
redis.call('SET', KEYS[2], cjson.encode(socketData), 'EX', ttlSeconds)

-- 3. Gather active collaborators
local updatedRaw = redis.call('HGETALL', KEYS[1])
local activeCollabs = {}
for i = 2, #updatedRaw, 2 do
    local r = cjson.decode(updatedRaw[i])
    if r and r.user then
        table.insert(activeCollabs, r.user)
    end
end

return { isFirst, cjson.encode(activeCollabs) }
`;

/**
 * Lua script for atomic leave from a board.
 * Prunes expired sockets and deletes the board key if empty.
 * KEYS[1] = boardKey
 * KEYS[2] = socketKey
 * ARGV[1] = userId
 * ARGV[2] = socketId
 * ARGV[3] = now (timestamp ms)
 * ARGV[4] = leaseMs (e.g. 60000)
 */
const LEAVE_LUA_SCRIPT = `
local existing = redis.call('HGET', KEYS[1], ARGV[1])
local isLast = 0
local nowNum = tonumber(ARGV[3])
local leaseMsNum = tonumber(ARGV[4])

if existing and existing ~= '' then
    local record = cjson.decode(existing)
    local remainingSockets = {}
    local activeCount = 0

    if record and record.sockets then
        for sid, lastHb in pairs(record.sockets) do
            if sid ~= ARGV[2] and (nowNum - tonumber(lastHb)) <= leaseMsNum then
                remainingSockets[sid] = lastHb
                activeCount = activeCount + 1
            end
        end
    end

    if activeCount == 0 then
        isLast = 1
        redis.call('HDEL', KEYS[1], ARGV[1])
    else
        record.sockets = remainingSockets
        redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(record))
    end
else
    isLast = 1
end

redis.call('DEL', KEYS[2])

local hlen = redis.call('HLEN', KEYS[1])
if hlen == 0 then
    redis.call('DEL', KEYS[1])
end

return isLast
`;

/**
 * Lua script for atomic heartbeat renewal on a board.
 * KEYS[1] = boardKey
 * KEYS[2] = socketKey
 * ARGV[1] = userId
 * ARGV[2] = socketId
 * ARGV[3] = now (timestamp ms)
 * ARGV[4] = leaseMs
 * ARGV[5] = boardId
 */
const HEARTBEAT_LUA_SCRIPT = `
local nowNum = tonumber(ARGV[3])
local leaseMsNum = tonumber(ARGV[4])
local existing = redis.call('HGET', KEYS[1], ARGV[1])

if not existing or existing == '' then
    return 0
end

local record = cjson.decode(existing)
if not record.sockets then record.sockets = {} end

local activeSockets = {}
for sid, lastHb in pairs(record.sockets) do
    if (nowNum - tonumber(lastHb)) <= leaseMsNum or sid == ARGV[2] then
        activeSockets[sid] = (sid == ARGV[2]) and nowNum or lastHb
    end
end

record.sockets = activeSockets
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(record))

local ttlSeconds = math.ceil((leaseMsNum * 2) / 1000)
redis.call('EXPIRE', KEYS[1], ttlSeconds)

local socketData = {
    userId = ARGV[1],
    boardId = ARGV[5],
    lastHeartbeat = nowNum
}
redis.call('SET', KEYS[2], cjson.encode(socketData), 'EX', ttlSeconds)

return 1
`;

/**
 * Lua script to prune crashed/expired sockets and return active collaborators.
 * KEYS[1] = boardKey
 * ARGV[1] = now (timestamp ms)
 * ARGV[2] = leaseMs
 */
const PRUNE_AND_GET_LUA_SCRIPT = `
local raw = redis.call('HGETALL', KEYS[1])
local nowNum = tonumber(ARGV[1])
local leaseMsNum = tonumber(ARGV[2])
local collabs = {}
local totalActiveUsers = 0

for i = 1, #raw, 2 do
    local uid = raw[i]
    local record = cjson.decode(raw[i+1])
    local activeSockets = {}
    local activeCount = 0

    if record and record.sockets then
        for sid, lastHb in pairs(record.sockets) do
            if (nowNum - tonumber(lastHb)) <= leaseMsNum then
                activeSockets[sid] = lastHb
                activeCount = activeCount + 1
            end
        end
    end

    if activeCount == 0 then
        redis.call('HDEL', KEYS[1], uid)
    else
        totalActiveUsers = totalActiveUsers + 1
        record.sockets = activeSockets
        redis.call('HSET', KEYS[1], uid, cjson.encode(record))
        if record.user then
            table.insert(collabs, record.user)
        end
    end
end

if totalActiveUsers == 0 then
    redis.call('DEL', KEYS[1])
else
    local ttlSeconds = math.ceil((leaseMsNum * 2) / 1000)
    redis.call('EXPIRE', KEYS[1], ttlSeconds)
end

return cjson.encode(collabs)
`;

/**
 * Returns an array of unique users currently active on the board.
 * Automatically prunes crashed or expired socket records.
 *
 * @param {string} boardId
 * @returns {Promise<Array<{ id: string, name: string, avatar: string }>>}
 */
const getBoardCollaborators = async (boardId) => {
  if (!boardId) return [];
  const targetBoardId = String(boardId);
  const now = Date.now();
  const client = getRedisClient();

  if (client && client.status === 'ready') {
    try {
      const boardKey = `${PRESENCE_BOARD_PREFIX}${targetBoardId}`;
      const resultJson = await client.eval(
        PRUNE_AND_GET_LUA_SCRIPT,
        1,
        boardKey,
        now.toString(),
        PRESENCE_LEASE_MS.toString()
      );
      if (resultJson) {
        return JSON.parse(resultJson);
      }
      return [];
    } catch (_) {
      // Fall through to in-memory fallback on Redis error
    }
  }

  // In-memory fallback with lease expiration pruning
  const userMap = localBoardPresence.get(targetBoardId);
  if (!userMap || userMap.size === 0) return [];

  const list = [];
  for (const [userId, record] of userMap.entries()) {
    if (record?.sockets) {
      for (const [sId, lastHb] of Object.entries(record.sockets)) {
        if (now - lastHb > PRESENCE_LEASE_MS) {
          delete record.sockets[sId];
        }
      }
      const activeSockets = Object.keys(record.sockets);
      if (activeSockets.length === 0) {
        userMap.delete(userId);
      } else if (record.user) {
        list.push({ ...record.user });
      }
    }
  }

  if (userMap.size === 0) {
    localBoardPresence.delete(targetBoardId);
  }

  return list;
};

/**
 * Registers an active socket viewing a board with an initial heartbeat lease.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} boardId
 * @returns {Promise<{
 *   isFirstSocketForUser: boolean,
 *   collaborators: Array<{ id: string, name: string, avatar: string }>,
 *   user: { id: string, name: string, avatar: string }|null,
 *   previousLeave: { isLastSocketForUser: boolean, userId: string|null, boardId: string|null }|null
 * }>}
 */
const trackBoardJoin = async (socket, boardId) => {
  if (!socket?.id || !boardId) {
    return {
      isFirstSocketForUser: false,
      collaborators: [],
      user: null,
      previousLeave: null,
    };
  }

  const targetBoardId = String(boardId);
  const user = sanitizePresenceUser(socket.data?.user);
  if (!user || !user.id) {
    return {
      isFirstSocketForUser: false,
      collaborators: [],
      user: null,
      previousLeave: null,
    };
  }

  let previousLeave = null;
  const currentTracking = localSocketTracking.get(socket.id);
  if (currentTracking?.boardId && currentTracking.boardId !== targetBoardId) {
    previousLeave = await trackBoardLeave(socket, currentTracking.boardId);
  }

  const now = Date.now();

  // In-memory mirror update
  let localUserMap = localBoardPresence.get(targetBoardId);
  if (!localUserMap) {
    localUserMap = new Map();
    localBoardPresence.set(targetBoardId, localUserMap);
  }

  let localIsFirst = false;
  let localRecord = localUserMap.get(user.id);
  if (!localRecord) {
    localIsFirst = true;
    localRecord = {
      user,
      boardId: targetBoardId,
      sockets: { [socket.id]: now },
      joinedAt: now,
    };
    localUserMap.set(user.id, localRecord);
  } else {
    localRecord.user = user;
    if (!localRecord.sockets) localRecord.sockets = {};
    localRecord.sockets[socket.id] = now;
  }

  localSocketTracking.set(socket.id, {
    userId: user.id,
    boardId: targetBoardId,
    lastHeartbeat: now,
  });

  // Start background heartbeat lease renewal for this socket
  if (!socket._presenceHeartbeatInterval) {
    socket._presenceHeartbeatInterval = setInterval(async () => {
      try {
        const tracking = localSocketTracking.get(socket.id);
        if (tracking?.boardId && socket.connected) {
          await renewSocketHeartbeat(socket, tracking.boardId);
        }
      } catch (_) {}
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);
    if (typeof socket._presenceHeartbeatInterval.unref === 'function') {
      socket._presenceHeartbeatInterval.unref();
    }
  }

  const client = getRedisClient();
  if (client && client.status === 'ready') {
    try {
      const boardKey = `${PRESENCE_BOARD_PREFIX}${targetBoardId}`;
      const socketKey = `${PRESENCE_SOCKET_PREFIX}${socket.id}`;

      const result = await client.eval(
        JOIN_LUA_SCRIPT,
        2,
        boardKey,
        socketKey,
        user.id,
        socket.id,
        JSON.stringify(user),
        now.toString(),
        PRESENCE_LEASE_MS.toString(),
        targetBoardId
      );

      const isFirstSocketForUser = Number(result[0]) === 1;
      let collaborators = [];
      try {
        collaborators = JSON.parse(result[1]);
      } catch (_) {
        collaborators = await getBoardCollaborators(targetBoardId);
      }

      return {
        isFirstSocketForUser,
        collaborators,
        user,
        previousLeave,
      };
    } catch (_) {
      // Fall through to in-memory return
    }
  }

  return {
    isFirstSocketForUser: localIsFirst,
    collaborators: await getBoardCollaborators(targetBoardId),
    user,
    previousLeave,
  };
};

/**
 * Renews the active heartbeat lease for a socket on a board.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} boardId
 * @returns {Promise<boolean>}
 */
const renewSocketHeartbeat = async (socket, boardId) => {
  if (!socket?.id || !boardId) return false;
  const targetBoardId = String(boardId);
  const userId = socket.data?.userId || localSocketTracking.get(socket.id)?.userId;
  if (!userId) return false;

  const now = Date.now();

  // Update in-memory mirror
  const currentTracking = localSocketTracking.get(socket.id);
  if (currentTracking) {
    currentTracking.lastHeartbeat = now;
  }

  const userMap = localBoardPresence.get(targetBoardId);
  const localRecord = userMap?.get(String(userId));
  if (localRecord?.sockets) {
    localRecord.sockets[socket.id] = now;
  }

  const client = getRedisClient();
  if (client && client.status === 'ready') {
    try {
      const boardKey = `${PRESENCE_BOARD_PREFIX}${targetBoardId}`;
      const socketKey = `${PRESENCE_SOCKET_PREFIX}${socket.id}`;

      const res = await client.eval(
        HEARTBEAT_LUA_SCRIPT,
        2,
        boardKey,
        socketKey,
        String(userId),
        socket.id,
        now.toString(),
        PRESENCE_LEASE_MS.toString(),
        targetBoardId
      );
      return Number(res) === 1;
    } catch (_) {
      return false;
    }
  }

  return true;
};

/**
 * Deregisters a socket from a board.
 * Emits leave only if this was the user's final active socket on the board.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} [boardId]
 * @returns {Promise<{ isLastSocketForUser: boolean, userId: string|null, boardId: string|null }>}
 */
const trackBoardLeave = async (socket, boardId) => {
  if (!socket?.id) {
    return { isLastSocketForUser: false, userId: null, boardId: null };
  }

  if (socket._presenceHeartbeatInterval) {
    clearInterval(socket._presenceHeartbeatInterval);
    socket._presenceHeartbeatInterval = null;
  }

  let targetBoardId = boardId ? String(boardId) : localSocketTracking.get(socket.id)?.boardId;
  const currentTracking = localSocketTracking.get(socket.id);
  const userId = socket.data?.userId || currentTracking?.userId;

  let localIsLast = false;
  let targetUserId = userId ? String(userId) : null;
  const now = Date.now();

  if (targetBoardId) {
    const userMap = localBoardPresence.get(targetBoardId);
    if (userMap) {
      let userRecord = targetUserId ? userMap.get(targetUserId) : null;
      if (!userRecord) {
        for (const [uid, rec] of userMap.entries()) {
          if (rec.sockets && rec.sockets[socket.id]) {
            targetUserId = uid;
            userRecord = rec;
            break;
          }
        }
      }

      if (userRecord?.sockets) {
        delete userRecord.sockets[socket.id];
        // Prune any other expired sockets
        for (const [sId, lastHb] of Object.entries(userRecord.sockets)) {
          if (now - lastHb > PRESENCE_LEASE_MS) {
            delete userRecord.sockets[sId];
          }
        }
        if (Object.keys(userRecord.sockets).length === 0) {
          userMap.delete(targetUserId);
          if (userMap.size === 0) {
            localBoardPresence.delete(targetBoardId);
          }
          localIsLast = true;
        }
      }
    }
  }

  if (currentTracking?.boardId === targetBoardId) {
    localSocketTracking.set(socket.id, {
      ...currentTracking,
      boardId: null,
    });
  }

  const client = getRedisClient();
  if (client && client.status === 'ready' && targetBoardId && targetUserId) {
    try {
      const boardKey = `${PRESENCE_BOARD_PREFIX}${targetBoardId}`;
      const socketKey = `${PRESENCE_SOCKET_PREFIX}${socket.id}`;

      const isLastNumber = await client.eval(
        LEAVE_LUA_SCRIPT,
        2,
        boardKey,
        socketKey,
        targetUserId,
        socket.id,
        now.toString(),
        PRESENCE_LEASE_MS.toString()
      );

      return {
        isLastSocketForUser: Number(isLastNumber) === 1,
        userId: targetUserId,
        boardId: targetBoardId,
      };
    } catch (_) {
      // Fall back to local calculation
    }
  }

  return {
    isLastSocketForUser: localIsLast,
    userId: targetUserId,
    boardId: targetBoardId || null,
  };
};

/**
 * Handles unexpected or graceful socket disconnect, cleaning up presence.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {Promise<{ isLastSocketForUser: boolean, userId: string|null, boardId: string|null }>}
 */
const handleSocketDisconnect = async (socket) => {
  if (!socket?.id) {
    return { isLastSocketForUser: false, userId: null, boardId: null };
  }

  if (socket._presenceHeartbeatInterval) {
    clearInterval(socket._presenceHeartbeatInterval);
    socket._presenceHeartbeatInterval = null;
  }

  let tracking = localSocketTracking.get(socket.id);
  const client = getRedisClient();

  if (!tracking?.boardId && client && client.status === 'ready') {
    try {
      const socketKey = `${PRESENCE_SOCKET_PREFIX}${socket.id}`;
      const raw = await client.get(socketKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.boardId && parsed?.userId) {
          tracking = parsed;
        }
      }
    } catch (_) {}
  }

  let leaveResult = { isLastSocketForUser: false, userId: null, boardId: null };

  if (tracking?.boardId) {
    leaveResult = await trackBoardLeave(socket, tracking.boardId);
  }

  localSocketTracking.delete(socket.id);
  return leaveResult;
};

/**
 * Checks whether any socket belonging to this user (other than excludeSocketId)
 * is currently typing on the specified board and card.
 *
 * @param {string} boardId
 * @param {string} cardId
 * @param {string} userId
 * @param {string} [excludeSocketId]
 * @param {import('socket.io').Server} [io]
 * @returns {boolean}
 */
const isUserTypingOnBoardCard = (boardId, cardId, userId, excludeSocketId, io) => {
  if (!boardId || !cardId || !userId || !io) return false;
  const userMap = localBoardPresence.get(String(boardId));
  const record = userMap?.get(String(userId));
  if (!record || !record.sockets) return false;

  const typingKey = `${boardId}:${cardId}`;
  for (const sId of Object.keys(record.sockets)) {
    if (sId === excludeSocketId) continue;
    const peerSocket = io.sockets?.sockets?.get(sId);
    if (peerSocket?._activeTyping?.has(typingKey)) {
      return true;
    }
  }
  return false;
};

/**
 * Clears all active presence and socket tracking state (for testing and shutdown).
 */
const clearPresence = async () => {
  localBoardPresence.clear();
  localSocketTracking.clear();

  const client = getRedisClient();
  if (client && client.status === 'ready') {
    try {
      const keys = await client.keys('flowdesk:presence:*');
      if (keys && keys.length > 0) {
        await client.del(...keys);
      }
    } catch (_) {}
  }
};

module.exports = {
  sanitizePresenceUser,
  getBoardCollaborators,
  trackBoardJoin,
  renewSocketHeartbeat,
  trackBoardLeave,
  handleSocketDisconnect,
  isUserTypingOnBoardCard,
  clearPresence,
  PRESENCE_LEASE_MS,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
};
