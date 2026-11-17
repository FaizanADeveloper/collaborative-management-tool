/**
 * Presence management for Flowdesk collaborative Kanban boards.
 *
 * Implements distributed Redis-backed presence tracking with multi-tab deduplication,
 * per-socket heartbeat leases, atomic crash recovery, and automatic in-memory fallback.
 */

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
} = require('../redis/presence');

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
