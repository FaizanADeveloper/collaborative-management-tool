const mongoose = require('mongoose');
const Board = require('../models/Board');
const WorkspaceMember = require('../models/WorkspaceMember');

const getUserRoom = (userId) => `user:${userId}`;
const getWorkspaceRoom = (workspaceId) => `workspace:${workspaceId}`;
const getBoardRoom = (boardId) => `board:${boardId}`;

/**
 * Parses a resource identifier from either a string payload or an object property.
 *
 * @param {string|object} payload
 * @param {string} key
 * @returns {string|null}
 */
const parseResourceId = (payload, key) => {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed || null;
  }
  if (payload && typeof payload === 'object' && typeof payload[key] === 'string') {
    const trimmed = payload[key].trim();
    return trimmed || null;
  }
  return null;
};

/**
 * Verifies that the authenticated user is a member of the requested workspace.
 *
 * @param {string|null} workspaceId
 * @param {string} userId
 */
const authorizeWorkspaceAccess = async (workspaceId, userId) => {
  if (!workspaceId || !mongoose.isObjectIdOrHexString(workspaceId)) {
    return {
      allowed: false,
      code: 'INVALID_ID',
      message: 'Invalid workspace identifier.',
    };
  }

  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });

  if (!membership) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: 'Access denied.',
    };
  }

  return {
    allowed: true,
    workspaceId: String(workspaceId),
    role: membership.role,
  };
};

/**
 * Verifies that the requested board exists and belongs to a workspace
 * in which the authenticated user holds active membership.
 *
 * @param {string|null} boardId
 * @param {string} userId
 */
const authorizeBoardAccess = async (boardId, userId) => {
  if (!boardId || !mongoose.isObjectIdOrHexString(boardId)) {
    return {
      allowed: false,
      code: 'INVALID_ID',
      message: 'Invalid board identifier.',
    };
  }

  const board = await Board.findById(boardId);
  if (!board || !board.workspace) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: 'Access denied.',
    };
  }

  const membership = await WorkspaceMember.findOne({
    workspace: board.workspace,
    user: userId,
  });

  if (!membership) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: 'Access denied.',
    };
  }

  return {
    allowed: true,
    boardId: String(boardId),
    workspaceId: String(board.workspace),
    role: membership.role,
  };
};

const sendAck = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

/**
 * Registers authenticated room lifecycle handlers on a connected socket.
 *
 * @param {import('socket.io').Server} _io
 * @param {import('socket.io').Socket} socket
 */
const registerRoomHandlers = async (_io, socket) => {
  const userId = socket.data?.userId;

  socket.on('workspace:join', async (payload, callback) => {
    try {
      const workspaceId = parseResourceId(payload, 'workspaceId');
      const auth = await authorizeWorkspaceAccess(workspaceId, userId);

      if (!auth.allowed) {
        return sendAck(callback, {
          ok: false,
          code: auth.code,
          error: auth.message,
        });
      }

      const room = getWorkspaceRoom(auth.workspaceId);
      await socket.join(room);

      return sendAck(callback, {
        ok: true,
        workspaceId: auth.workspaceId,
        room,
        role: auth.role,
      });
    } catch {
      return sendAck(callback, {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Unable to join workspace room.',
      });
    }
  });

  socket.on('workspace:leave', async (payload, callback) => {
    try {
      const workspaceId = parseResourceId(payload, 'workspaceId');
      if (!workspaceId || !mongoose.isObjectIdOrHexString(workspaceId)) {
        return sendAck(callback, {
          ok: false,
          code: 'INVALID_ID',
          error: 'Invalid workspace identifier.',
        });
      }

      const room = getWorkspaceRoom(workspaceId);
      await socket.leave(room);

      return sendAck(callback, {
        ok: true,
        workspaceId,
        room,
      });
    } catch {
      return sendAck(callback, {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Unable to leave workspace room.',
      });
    }
  });

  socket.on('board:join', async (payload, callback) => {
    try {
      const boardId = parseResourceId(payload, 'boardId');
      const auth = await authorizeBoardAccess(boardId, userId);

      if (!auth.allowed) {
        return sendAck(callback, {
          ok: false,
          code: auth.code,
          error: auth.message,
        });
      }

      const room = getBoardRoom(auth.boardId);
      await socket.join(room);

      return sendAck(callback, {
        ok: true,
        boardId: auth.boardId,
        workspaceId: auth.workspaceId,
        room,
        role: auth.role,
      });
    } catch {
      return sendAck(callback, {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Unable to join board room.',
      });
    }
  });

  socket.on('board:leave', async (payload, callback) => {
    try {
      const boardId = parseResourceId(payload, 'boardId');
      if (!boardId || !mongoose.isObjectIdOrHexString(boardId)) {
        return sendAck(callback, {
          ok: false,
          code: 'INVALID_ID',
          error: 'Invalid board identifier.',
        });
      }

      const room = getBoardRoom(boardId);
      await socket.leave(room);

      return sendAck(callback, {
        ok: true,
        boardId,
        room,
      });
    } catch {
      return sendAck(callback, {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Unable to leave board room.',
      });
    }
  });

  if (userId) {
    await socket.join(getUserRoom(userId));
  }
};

module.exports = {
  getUserRoom,
  getWorkspaceRoom,
  getBoardRoom,
  authorizeWorkspaceAccess,
  authorizeBoardAccess,
  registerRoomHandlers,
};
