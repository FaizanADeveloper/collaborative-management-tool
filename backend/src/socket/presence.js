/**
 * In-memory presence registry for Flowdesk collaborative Kanban boards.
 *
 * Tracks active socket connections, deduplicates presence by authenticated user,
 * supports multiple simultaneous sockets per user (e.g. multiple tabs), and emits
 * clean leave events only when a user's final connection to a board departs.
 */

const boardPresence = new Map();
const socketTracking = new Map();

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
 * Returns an array of all unique users currently active on the specified board.
 *
 * @param {string} boardId
 * @returns {Array<{ id: string, name: string, avatar: string }>}
 */
const getBoardCollaborators = (boardId) => {
  if (!boardId) return [];
  const key = String(boardId);
  const userMap = boardPresence.get(key);
  if (!userMap || userMap.size === 0) return [];

  const list = [];
  for (const record of userMap.values()) {
    if (record && record.user) {
      list.push({ ...record.user });
    }
  }
  return list;
};

/**
 * Registers an active socket viewing a board.
 *
 * If the user already had another socket connected to this board (e.g. another tab),
 * the new socket is added to the user's tracking set without re-announcing join.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} boardId
 * @returns {{
 *   isFirstSocketForUser: boolean,
 *   collaborators: Array<{ id: string, name: string, avatar: string }>,
 *   user: { id: string, name: string, avatar: string }|null,
 *   previousLeave: { isLastSocketForUser: boolean, userId: string|null, boardId: string|null }|null
 * }}
 */
const trackBoardJoin = (socket, boardId) => {
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
  const currentTracking = socketTracking.get(socket.id);
  if (currentTracking?.boardId && currentTracking.boardId !== targetBoardId) {
    previousLeave = trackBoardLeave(socket, currentTracking.boardId);
  }

  let userMap = boardPresence.get(targetBoardId);
  if (!userMap) {
    userMap = new Map();
    boardPresence.set(targetBoardId, userMap);
  }

  let isFirstSocketForUser = false;
  let record = userMap.get(user.id);

  if (!record) {
    isFirstSocketForUser = true;
    record = {
      user,
      socketIds: new Set([socket.id]),
      joinedAt: Date.now(),
    };
    userMap.set(user.id, record);
  } else {
    record.user = user;
    record.socketIds.add(socket.id);
  }

  socketTracking.set(socket.id, {
    userId: user.id,
    boardId: targetBoardId,
  });

  return {
    isFirstSocketForUser,
    collaborators: getBoardCollaborators(targetBoardId),
    user,
    previousLeave,
  };
};

/**
 * Deregisters a socket from a board.
 *
 * Emits leave only if this was the user's final active socket on the board.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} [boardId]
 * @returns {{ isLastSocketForUser: boolean, userId: string|null, boardId: string|null }}
 */
const trackBoardLeave = (socket, boardId) => {
  if (!socket?.id) {
    return { isLastSocketForUser: false, userId: null, boardId: null };
  }

  const targetBoardId = boardId ? String(boardId) : socketTracking.get(socket.id)?.boardId;
  if (!targetBoardId) {
    return { isLastSocketForUser: false, userId: null, boardId: null };
  }

  const currentTracking = socketTracking.get(socket.id);
  if (currentTracking?.boardId === targetBoardId) {
    socketTracking.set(socket.id, {
      ...currentTracking,
      boardId: null,
    });
  }

  const userMap = boardPresence.get(targetBoardId);
  if (!userMap) {
    return { isLastSocketForUser: false, userId: null, boardId: targetBoardId };
  }

  const userId = socket.data?.userId || currentTracking?.userId;
  let targetUserId = userId ? String(userId) : null;
  let userRecord = targetUserId ? userMap.get(targetUserId) : null;

  if (!userRecord) {
    for (const [uid, rec] of userMap.entries()) {
      if (rec.socketIds && rec.socketIds.has(socket.id)) {
        targetUserId = uid;
        userRecord = rec;
        break;
      }
    }
  }

  if (!userRecord) {
    return { isLastSocketForUser: false, userId: null, boardId: targetBoardId };
  }

  userRecord.socketIds.delete(socket.id);

  if (userRecord.socketIds.size === 0) {
    userMap.delete(targetUserId);
    if (userMap.size === 0) {
      boardPresence.delete(targetBoardId);
    }
    return {
      isLastSocketForUser: true,
      userId: targetUserId,
      boardId: targetBoardId,
    };
  }

  return {
    isLastSocketForUser: false,
    userId: targetUserId,
    boardId: targetBoardId,
  };
};

/**
 * Handles unexpected or graceful socket disconnect, cleaning up any tracked board presence.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {{ isLastSocketForUser: boolean, userId: string|null, boardId: string|null }}
 */
const handleSocketDisconnect = (socket) => {
  if (!socket?.id) {
    return { isLastSocketForUser: false, userId: null, boardId: null };
  }

  const tracking = socketTracking.get(socket.id);
  let leaveResult = { isLastSocketForUser: false, userId: null, boardId: null };

  if (tracking?.boardId) {
    leaveResult = trackBoardLeave(socket, tracking.boardId);
  }

  socketTracking.delete(socket.id);
  return leaveResult;
};

/**
 * Clears all active presence and socket tracking state (for testing and shutdown).
 */
const clearPresence = () => {
  boardPresence.clear();
  socketTracking.clear();
};

module.exports = {
  sanitizePresenceUser,
  getBoardCollaborators,
  trackBoardJoin,
  trackBoardLeave,
  handleSocketDisconnect,
  clearPresence,
};
