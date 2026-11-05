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
 * Workspace update request validation schema
 */
const updateWorkspaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Workspace name must be at least 2 characters')
      .max(100, 'Workspace name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Workspace description cannot exceed 500 characters')
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    {
      message: 'At least one field (name or description) must be provided for update',
    }
  );

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

/**
 * Invite code parameter validation schema
 */
const inviteCodeParamSchema = z.object({
  inviteCode: z
    .string({ required_error: 'Invite code is required' })
    .trim()
    .min(4, 'Invalid invitation code format'),
});

/**
 * Remove member parameters validation schema (:id and :userId)
 */
const removeMemberParamSchema = z.object({
  id: z
    .string({ required_error: 'Workspace ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid workspace ID format',
    }),
  userId: z
    .string({ required_error: 'User ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid user ID format',
    }),
});

module.exports = {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  inviteCodeParamSchema,
  removeMemberParamSchema,
};
