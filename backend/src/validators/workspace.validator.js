const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Workspace creation request validation schema
 */
const createWorkspaceSchema = z.object({
  name: z
    .string({ required_error: 'Workspace name is required' })
    .trim()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(100, 'Workspace name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Workspace description cannot exceed 500 characters')
    .optional()
    .default(''),
});

/**
 * Workspace ID parameter validation schema
 */
const workspaceIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Workspace ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid workspace ID format',
    }),
});

module.exports = {
  createWorkspaceSchema,
  workspaceIdParamSchema,
};
