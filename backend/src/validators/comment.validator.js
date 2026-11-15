const { z } = require('zod');
const mongoose = require('mongoose');

/**
 * Validates a MongoDB ObjectId string
 */
const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.isObjectIdOrHexString(val), {
    message: 'Invalid ID format',
  });

/**
 * Comment creation request body validation schema
 * Strict mode prevents mass assignment of author, card, board, or workspace
 */
const createCommentSchema = z
  .object({
    content: z
      .string({ required_error: 'Comment content is required' })
      .trim()
      .min(1, 'Comment content must be at least 1 character')
      .max(2000, 'Comment content cannot exceed 2000 characters'),
  })
  .strict({
    message: 'Unexpected fields in request body; mass assignment is not permitted',
  });

/**
 * Validates route parameters containing cardId
 */
const cardIdParamSchema = z.object({
  cardId: objectIdSchema,
});

/**
 * Validates route parameters containing both cardId and commentId
 */
const cardAndCommentParamSchema = z.object({
  cardId: objectIdSchema,
  commentId: objectIdSchema,
});

module.exports = {
  createCommentSchema,
  cardIdParamSchema,
  cardAndCommentParamSchema,
};
