const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Board creation request body validation schema
 */
const createBoardSchema = z.object({
  name: z
    .string({ required_error: 'Board name is required' })
    .trim()
    .min(2, 'Board name must be at least 2 characters')
    .max(100, 'Board name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Board description cannot exceed 500 characters')
    .optional()
    .default(''),
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
 * Board ID route parameter validation schema (:id)
 */
const boardIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Board ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid board ID format',
    }),
});

module.exports = {
  createBoardSchema,
  workspaceIdParamSchema,
  boardIdParamSchema,
};
