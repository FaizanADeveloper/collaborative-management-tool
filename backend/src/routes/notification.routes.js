const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middleware/auth.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const validateQuery = require('../middleware/validateQuery.middleware');
const {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} = require('../validators/notification.validator');

const router = express.Router();

/**
 * List paginated notifications for authenticated user
 * GET /api/notifications
 */
router.get(
  '/notifications',
  authenticate,
  validateQuery(listNotificationsQuerySchema),
  notificationController.getUserNotifications
);

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
router.get(
  '/notifications/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
router.patch(
  '/notifications/read-all',
  authenticate,
  notificationController.markAllAsRead
);

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:notificationId/read
 */
router.patch(
  '/notifications/:notificationId/read',
  authenticate,
  validateParams(notificationIdParamSchema),
  notificationController.markNotificationAsRead
);

/**
 * Delete a single notification
 * DELETE /api/notifications/:notificationId
 */
router.delete(
  '/notifications/:notificationId',
  authenticate,
  validateParams(notificationIdParamSchema),
  notificationController.deleteNotification
);

module.exports = router;
