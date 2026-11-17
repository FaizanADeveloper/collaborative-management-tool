const {
  createRedisClient,
  initRedis,
  getRedisClient,
  getRedisStatus,
  closeRedis,
  sanitizeRedisErrorMessage,
} = require('./client');

const {
  initSocketAdapter,
  getAdapterStatus,
  closeSocketAdapter,
} = require('./adapter');

const {
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
} = require('./presence');

const {
  setCardTypingStatus,
  isUserTypingDistributed,
} = require('./typing');

module.exports = {
  createRedisClient,
  initRedis,
  getRedisClient,
  getRedisStatus,
  closeRedis,
  sanitizeRedisErrorMessage,
  initSocketAdapter,
  getAdapterStatus,
  closeSocketAdapter,
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
  setCardTypingStatus,
  isUserTypingDistributed,
};
