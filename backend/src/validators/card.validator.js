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
 * Priority enum schema
 */
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Priority must be low, medium, high, or urgent' }),
});

/**
 * Validates MongoDB ObjectId string
 */
const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.isObjectIdOrHexString(val), {
    message: 'Invalid ID format',
  });

/**
 * Card creation request body validation schema
 */
const createCardSchema = z.object({
  title: z
    .string({ required_error: 'Card title is required' })
    .trim()
    .min(1, 'Card title must be at least 1 character')
    .max(200, 'Card title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Card description cannot exceed 5000 characters')
    .optional(),
  position: positionSchema.optional(),
  priority: prioritySchema.optional(),
  assignees: z.array(objectIdSchema).optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.null())
    .optional(),
  labels: z.array(z.string().trim().max(50)).optional(),
});

/**
 * Card update request body validation schema
 */
const updateCardSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Card title must be at least 1 character')
      .max(200, 'Card title cannot exceed 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, 'Card description cannot exceed 5000 characters')
      .optional(),
    position: positionSchema.optional(),
    priority: prioritySchema.optional(),
    assignees: z.array(objectIdSchema).optional(),
    dueDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .or(z.null())
      .optional(),
    labels: z.array(z.string().trim().max(50)).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.position !== undefined ||
      data.priority !== undefined ||
      data.assignees !== undefined ||
      data.dueDate !== undefined ||
      data.labels !== undefined,
    {
      message: 'At least one field must be provided for update',
    }
  );

/**
 * Card move request body validation schema
 */
const moveCardSchema = z.object({
  destinationListId: z
    .string({ required_error: 'Destination list ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid destination list ID format',
    }),
  position: positionSchema,
});

/**
 * List ID route parameter validation schema (:listId)
 */
const listIdParamSchema = z.object({
  listId: z
    .string({ required_error: 'List ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid list ID format',
    }),
});

/**
 * Card ID route parameter validation schema (:id)
 */
const cardIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Card ID is required' })
    .trim()
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: 'Invalid card ID format',
    }),
});

module.exports = {
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  listIdParamSchema,
  cardIdParamSchema,
};
