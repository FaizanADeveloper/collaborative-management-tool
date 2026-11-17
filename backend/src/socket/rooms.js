const mongoose = require('mongoose');
const Board = require('../models/Board');
const Card = require('../models/Card');
const WorkspaceMember = require('../models/WorkspaceMember');
const {
  trackBoardJoin,
  renewSocketHeartbeat,
  trackBoardLeave,
  handleSocketDisconnect,
  sanitizePresenceUser,
  isUserTypingOnBoardCard,
  setCardTypingStatus,
  isUserTypingDistributed,
} = require('../redis');

let eventsModule = null;
const getEvents = () => {
  if (!eventsModule) {
    eventsModule = require('./events');
  }
  return eventsModule;
};

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
const registerRoomHandlers = async (io, socket) => {
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

      const joinResult = await trackBoardJoin(socket, auth.boardId);

      if (
        joinResult.previousLeave?.isLastSocketForUser &&
        joinResult.previousLeave?.boardId &&
        joinResult.previousLeave?.userId
      ) {
        getEvents().emitPresenceLeave(
          joinResult.previousLeave.boardId,
          joinResult.previousLeave.userId,
          io
        );
      }

      if (joinResult.isFirstSocketForUser && joinResult.user) {
        getEvents().emitPresenceJoin(auth.boardId, joinResult.user, io);
      }

      return sendAck(callback, {
        ok: true,
        boardId: auth.boardId,
        workspaceId: auth.workspaceId,
        room,
        role: auth.role,
        collaborators: joinResult.collaborators,
      });
    } catch {
      return sendAck(callback, {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Unable to join board room.',
      });
    }
  });

  socket.on('presence:heartbeat', async (payload, callback) => {
    try {
      const boardId = parseResourceId(payload, 'boardId');
      if (!boardId || !mongoose.isObjectIdOrHexString(boardId)) {
        return sendAck(callback, {
          ok: false,
          code: 'INVALID_ID',
          error: 'Invalid board identifier.',
        });
      }

      const renewed = await renewSocketHeartbeat(socket, boardId);
      return sendAck(callback, { ok: renewed, boardId });
    } catch {
      return sendAck(callback, {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Failed to renew presence heartbeat.',
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

      const leaveResult = await trackBoardLeave(socket, boardId);
      const room = getBoardRoom(boardId);
      await socket.leave(room);

      // Clean up any active typing for this socket on the departing board
      if (socket._activeTyping) {
        for (const [key, record] of socket._activeTyping.entries()) {
          if (record.boardId === boardId) {
            if (record.timer) clearTimeout(record.timer);
            socket._activeTyping.delete(key);
            await setCardTypingStatus(record.boardId, record.cardId, record.user.id, socket.id, false);
            const stillTyping = await isUserTypingDistributed(record.boardId, record.cardId, record.user.id, socket.id, io);
            if (!stillTyping) {
              getEvents().emitCardTyping({
                boardId: record.boardId,
                cardId: record.cardId,
                isTyping: false,
                user: record.user,
                ioOverride: io,
              });
            }
          }
        }
      }

      if (
        leaveResult?.isLastSocketForUser &&
        leaveResult?.userId &&
        leaveResult?.boardId
      ) {
        getEvents().emitPresenceLeave(leaveResult.boardId, leaveResult.userId, io);
      }

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

  socket.on('card:typing', async (payload, callback) => {
    try {
      const boardId = parseResourceId(payload, 'boardId');
      const cardId = parseResourceId(payload, 'cardId');
      const isTyping = Boolean(payload?.isTyping);

      if (!boardId || !mongoose.isObjectIdOrHexString(boardId)) {
        return sendAck(callback, {
          ok: false,
          code: 'INVALID_ID',
          error: 'Invalid board identifier.',
        });
      }

      if (!cardId || !mongoose.isObjectIdOrHexString(cardId)) {
        return sendAck(callback, {
          ok: false,
          code: 'INVALID_ID',
          error: 'Invalid card identifier.',
        });
      }

      if (!userId) {
        return sendAck(callback, {
          ok: false,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }

      const boardRoom = getBoardRoom(boardId);
      if (!socket.rooms.has(boardRoom)) {
        return sendAck(callback, {
          ok: false,
          code: 'FORBIDDEN',
          error: 'Socket must join the board room before sending typing events.',
        });
      }

      const auth = await authorizeBoardAccess(boardId, userId);
      if (!auth.allowed) {
        return sendAck(callback, {
          ok: false,
          code: auth.code,
          error: auth.message,
        });
      }

      const card = await Card.findById(cardId).select('board').lean();
      if (!card || String(card.board) !== String(boardId)) {
        return sendAck(callback, {
          ok: false,
          code: 'FORBIDDEN',
          error: 'Card does not belong to the specified board.',
        });
      }

      const user = sanitizePresenceUser(socket.data?.user);
      if (!user || !user.id) {
        return sendAck(callback, {
          ok: false,
          code: 'UNAUTHORIZED',
          error: 'Invalid user session.',
        });
      }

      if (!socket._activeTyping) {
        socket._activeTyping = new Map();
      }

      const typingKey = `${boardId}:${cardId}`;
      const existing = socket._activeTyping.get(typingKey);
      if (existing?.timer) {
        clearTimeout(existing.timer);
      }

      if (isTyping) {
        await setCardTypingStatus(boardId, cardId, user.id, socket.id, true);
        // Safety timeout to auto-clear typing if client stops unexpectedly
        const timer = setTimeout(async () => {
          const current = socket._activeTyping?.get(typingKey);
          if (current && current.timer === timer) {
            socket._activeTyping.delete(typingKey);
            await setCardTypingStatus(boardId, cardId, user.id, socket.id, false);
            const stillTyping = await isUserTypingDistributed(boardId, cardId, user.id, socket.id, io);
            if (!stillTyping) {
              getEvents().emitCardTyping({
                boardId,
                cardId,
                isTyping: false,
                user,
                ioOverride: io,
              });
            }
          }
        }, 5000);

        socket._activeTyping.set(typingKey, { boardId, cardId, timer, user });

        getEvents().emitCardTyping({
          boardId,
          cardId,
          isTyping: true,
          user,
          socket,
        });
      } else {
        socket._activeTyping.delete(typingKey);
        await setCardTypingStatus(boardId, cardId, user.id, socket.id, false);
        const stillTyping = await isUserTypingDistributed(boardId, cardId, user.id, socket.id, io);
        if (!stillTyping) {
          getEvents().emitCardTyping({
            boardId,
            cardId,
            isTyping: false,
            user,
            socket,
          });
        }
      }

      return sendAck(callback, { ok: true, boardId, cardId, isTyping });
    } catch {
      return sendAck(callback, {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Unable to process typing event.',
      });
    }
  });

  socket.on('disconnecting', async () => {
    try {
      if (socket._activeTyping) {
        for (const record of socket._activeTyping.values()) {
          if (record.timer) clearTimeout(record.timer);
          await setCardTypingStatus(record.boardId, record.cardId, record.user.id, socket.id, false);
          const stillTyping = await isUserTypingDistributed(record.boardId, record.cardId, record.user.id, socket.id, io);
          if (!stillTyping) {
            getEvents().emitCardTyping({
              boardId: record.boardId,
              cardId: record.cardId,
              isTyping: false,
              user: record.user,
              ioOverride: io,
            });
          }
        }
        socket._activeTyping.clear();
      }

      const leaveResult = await handleSocketDisconnect(socket);
      if (
        leaveResult?.isLastSocketForUser &&
        leaveResult?.userId &&
        leaveResult?.boardId
      ) {
        getEvents().emitPresenceLeave(leaveResult.boardId, leaveResult.userId, io);
      }
    } catch {
      // Prevent unhandled errors during disconnect
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
