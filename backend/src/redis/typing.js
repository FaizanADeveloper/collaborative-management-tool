const { getRedisClient } = require('./client');

const TYPING_KEY_PREFIX = 'flowdesk:typing:board:';
const TYPING_TTL_SECONDS = 6;

/**
 * Sets or clears active typing state in Redis for a specific socket and user.
 *
 * @param {string} boardId
 * @param {string} cardId
 * @param {string} userId
 * @param {string} socketId
 * @param {boolean} isTyping
 * @returns {Promise<void>}
 */
const setCardTypingStatus = async (boardId, cardId, userId, socketId, isTyping) => {
  if (!boardId || !cardId || !userId || !socketId) return;
  const client = getRedisClient();

  if (client && client.status === 'ready') {
    try {
      const key = `${TYPING_KEY_PREFIX}${boardId}:card:${cardId}`;
      const field = `${userId}:${socketId}`;

      if (isTyping) {
        await client.hset(key, field, Date.now().toString());
        await client.expire(key, TYPING_TTL_SECONDS);
      } else {
        await client.hdel(key, field);
      }
    } catch (_) {
      // In-memory fallback takes over on error
    }
  }
};

/**
 * Checks whether any socket belonging to this user (other than excludeSocketId)
 * is currently typing on the specified board and card.
 *
 * Checks Redis first for cross-instance accuracy, falling back to local memory.
 *
 * @param {string} boardId
 * @param {string} cardId
 * @param {string} userId
 * @param {string} [excludeSocketId]
 * @param {import('socket.io').Server} [io]
 * @returns {Promise<boolean>}
 */
const isUserTypingDistributed = async (boardId, cardId, userId, excludeSocketId, io) => {
  if (!boardId || !cardId || !userId) return false;
  const client = getRedisClient();

  if (client && client.status === 'ready') {
    try {
      const key = `${TYPING_KEY_PREFIX}${boardId}:card:${cardId}`;
      const fields = await client.hkeys(key);
      if (fields && fields.length > 0) {
        const prefix = `${userId}:`;
        const excludeField = excludeSocketId ? `${userId}:${excludeSocketId}` : null;
        const hasOther = fields.some((f) => f.startsWith(prefix) && f !== excludeField);
        if (hasOther) return true;
      }
    } catch (_) {
      // Fall through to in-memory check
    }
  }

  const { isUserTypingOnBoardCard } = require('./presence');
  return isUserTypingOnBoardCard(boardId, cardId, userId, excludeSocketId, io);
};

module.exports = {
  setCardTypingStatus,
  isUserTypingDistributed,
};
