const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const WorkspaceMember = require('../models/WorkspaceMember');
const ApiError = require('../utils/ApiError');
const socketEvents = require('../socket/events');

/**
 * Creates and persists a notification, then delivers it in real time
 * Features actor exclusion, workspace membership verification, and idempotency deduplication.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.recipient - Recipient user ID
 * @param {string|mongoose.Types.ObjectId|null} [params.actor=null] - Acting user ID
 * @param {string|mongoose.Types.ObjectId} params.workspace - Workspace ID
 * @param {'task_assignment'|'card_comment'|'workspace_join'|'task_activity'} params.type - Notification type
 * @param {string} params.title - Concise title
 * @param {string} params.message - Concise message
 * @param {'card'|'board'|'workspace'} [params.resourceType='card'] - Resource type
 * @param {string|mongoose.Types.ObjectId|null} [params.resourceId=null] - Resource ID
 * @returns {Promise<object|null>} Created notification document or null
 */
const createNotification = async ({
  recipient,
  actor = null,
  workspace,
  type,
  title,
  message,
  resourceType = 'card',
  resourceId = null,
}) => {
  try {
    if (!recipient || !workspace || !type || !title || !message) {
      return null;
    }

    const recipientId = recipient.toString();
    const actorId = actor ? actor.toString() : null;

    // 1. Strict Actor Exclusion: Never notify the actor about their own action
    if (actorId && recipientId === actorId) {
      return null;
    }

    // 2. Workspace Membership Verification: Confirm recipient holds active membership in workspace
    const membership = await WorkspaceMember.findOne({
      workspace,
      user: recipient,
    });
    if (!membership) {
      return null;
    }

    // 3. Idempotency & Deduplication: Prevent duplicate notifications generated within a 10s window
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const existing = await Notification.findOne({
      recipient,
      actor: actor || null,
      workspace,
      type,
      resourceId: resourceId || null,
      createdAt: { $gte: tenSecondsAgo },
    });

    if (existing) {
      return existing.toJSON ? existing.toJSON() : existing;
    }

    // 4. Persistence
    const notification = await Notification.create({
      recipient,
      actor: actor || null,
      workspace,
      type,
      title,
      message,
      resourceType,
      resourceId: resourceId || null,
      isRead: false,
    });

    await notification.populate('actor', 'name avatar email');
    await notification.populate('workspace', 'name');

    const serialized = notification.toJSON ? notification.toJSON() : notification;

    // 5. Real-Time Delivery via Socket.IO & Redis Adapter
    socketEvents.emitNewNotification(recipient, serialized);

    return serialized;
  } catch (error) {
    // Non-blocking failure: Notification errors must never abort caller business mutations
    console.error(`[Notification Service] Failed to create notification: ${error.message}`);
    return null;
  }
};

/**
 * Retrieves paginated notifications for the authenticated recipient
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
 * @param {object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {boolean} [options.unreadOnly=false]
 * @param {string|mongoose.Types.ObjectId} [options.workspaceId]
 * @returns {Promise<object>}
 */
const getUserNotifications = async (
  userId,
  { page = 1, limit = 20, unreadOnly = false, workspaceId = null } = {}
) => {
  const filter = { recipient: userId };

  if (unreadOnly) {
    filter.isRead = false;
  }

  if (workspaceId && mongoose.isObjectIdOrHexString(workspaceId)) {
    filter.workspace = workspaceId;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name avatar email')
      .populate('workspace', 'name'),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      recipient: userId,
      isRead: false,
      ...(workspaceId && mongoose.isObjectIdOrHexString(workspaceId)
        ? { workspace: workspaceId }
        : {}),
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    notifications: notifications.map((n) => (n.toJSON ? n.toJSON() : n)),
    total,
    unreadCount,
    page,
    limit,
    totalPages,
  };
};

/**
 * Returns the unread notification count for the authenticated recipient
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
 * @param {string|mongoose.Types.ObjectId|null} [workspaceId=null]
 * @returns {Promise<{ count: number }>}
 */
const getUnreadCount = async (userId, workspaceId = null) => {
  const filter = {
    recipient: userId,
    isRead: false,
  };

  if (workspaceId && mongoose.isObjectIdOrHexString(workspaceId)) {
    filter.workspace = workspaceId;
  }

  const count = await Notification.countDocuments(filter);
  return { count };
};

/**
 * Marks a single notification as read for the authorized recipient
 *
 * @param {string|mongoose.Types.ObjectId} notificationId - Notification ID
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user ID
 * @returns {Promise<object>}
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  await notification.populate('actor', 'name avatar email');
  await notification.populate('workspace', 'name');

  return notification.toJSON ? notification.toJSON() : notification;
};

/**
 * Marks all notifications as read for the authenticated recipient
 *
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user ID
 * @param {string|mongoose.Types.ObjectId|null} [workspaceId=null]
 * @returns {Promise<{ modifiedCount: number }>}
 */
const markAllAsRead = async (userId, workspaceId = null) => {
  const filter = {
    recipient: userId,
    isRead: false,
  };

  if (workspaceId && mongoose.isObjectIdOrHexString(workspaceId)) {
    filter.workspace = workspaceId;
  }

  const result = await Notification.updateMany(filter, {
    $set: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    modifiedCount: result.modifiedCount || 0,
  };
};

/**
 * Deletes a single notification owned by the authenticated recipient
 *
 * @param {string|mongoose.Types.ObjectId} notificationId - Notification ID
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user ID
 * @returns {Promise<null>}
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  return null;
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
};
