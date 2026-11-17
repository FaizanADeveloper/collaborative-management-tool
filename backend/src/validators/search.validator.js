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
 * Workspace ID route parameter validation schema (:workspaceId)
 */
const workspaceIdParamSchema = z.object({
  workspaceId: z
    .string({ required_error: 'Workspace ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid workspace ID format',
    }),
});

/**
 * Search query parameters validation schema
 */
const searchQuerySchema = z.object({
  q: z
    .string({ required_error: 'Search query is required' })
    .trim()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query cannot exceed 100 characters'),
  type: z
    .enum(['all', 'cards', 'boards', 'lists'], {
      errorMap: () => ({ message: "Type must be 'all', 'cards', 'boards', or 'lists'" }),
    })
    .optional()
    .default('all'),
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
        .max(100, 'Limit cannot exceed 100')
    )
    .default(20),
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
  boardId: objectIdSchema.optional(),
});

module.exports = {
  workspaceIdParamSchema,
  searchQuerySchema,
};
