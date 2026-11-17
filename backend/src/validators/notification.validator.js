const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Validates a valid MongoDB ObjectId string
 */
const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.isObjectIdOrHexString(val), {
    message: 'Invalid ID format',
  });

/**
 * Notification ID route parameter schema (:notificationId)
 */
const notificationIdParamSchema = z.object({
  notificationId: objectIdSchema,
});

/**
 * Notification list query parameters schema
 */
const listNotificationsQuerySchema = z.object({
  page: z
    .preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return 1;
        const parsed = Number(val);
        return Number.isNaN(parsed) ? val : parsed;
      },
      z
        .number({ invalid_type_error: 'Page must be a number' })
        .int('Page must be an integer')
        .min(1, 'Page must be at least 1')
    )
    .default(1),
  limit: z
    .preprocess(
      (val) => {
        if (val === undefined || val === null || val === '') return 20;
        const parsed = Number(val);
        return Number.isNaN(parsed) ? val : parsed;
      },
      z
        .number({ invalid_type_error: 'Limit must be a number' })
        .int('Limit must be an integer')
        .min(1, 'Limit must be at least 1')
        .max(50, 'Limit cannot exceed 50')
    )
    .default(20),
  unreadOnly: z
    .preprocess(
      (val) => {
        if (val === 'true' || val === true || val === '1' || val === 1) return true;
        return false;
      },
      z.boolean()
    )
    .default(false),
  workspaceId: objectIdSchema.optional(),
});

module.exports = {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
};
