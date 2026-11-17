const notificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Retrieve paginated notifications for the authenticated user
 * GET /api/notifications
 */
const getUserNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(
    req.user._id,
    req.query
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(
    req.user._id,
    req.query.workspaceId
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Unread notification count retrieved successfully',
    data: result,
  });
});

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:notificationId/read
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markNotificationAsRead(
    req.params.notificationId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Notification marked as read',
    data: {
      notification: result,
    },
  });
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(
    req.user._id,
    req.query.workspaceId
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'All notifications marked as read',
    data: result,
  });
});

/**
 * Delete a notification
 * DELETE /api/notifications/:notificationId
 */
const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(
    req.params.notificationId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Notification deleted successfully',
    data: null,
  });
});

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
};
