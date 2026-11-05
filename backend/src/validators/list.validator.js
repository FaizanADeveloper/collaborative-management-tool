const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Validates a finite, non-negative position number
 */
const positionSchema = z
  .number({
    invalid_type_error: 'Position must be a number',
  })
  .finite('Position must be a finite number')
  .min(0, 'Position must be a non-negative number');

/**
 * List creation request body validation schema
 */
const createListSchema = z.object({
  name: z
    .string({ required_error: 'List name is required' })
    .trim()
    .min(1, 'List name must be at least 1 character')
    .max(100, 'List name cannot exceed 100 characters'),
  position: positionSchema.optional(),
});

/**
 * List update request body validation schema
 */
const updateListSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'List name must be at least 1 character')
      .max(100, 'List name cannot exceed 100 characters')
      .optional(),
    position: positionSchema.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.position !== undefined,
    {
      message: 'At least one field (name or position) must be provided for update',
    }
  );

/**
 * Board ID route parameter validation schema (:boardId)
 */
const boardIdParamSchema = z.object({
  boardId: z
    .string({ required_error: 'Board ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid board ID format',
    }),
});

/**
 * List ID route parameter validation schema (:id)
 */
const listIdParamSchema = z.object({
  id: z
    .string({ required_error: 'List ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid list ID format',
    }),
});

module.exports = {
  createListSchema,
  updateListSchema,
  boardIdParamSchema,
  listIdParamSchema,
};
