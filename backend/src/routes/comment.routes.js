const express = require('express');
const commentController = require('../controllers/comment.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const {
  createCommentSchema,
  cardIdParamSchema,
  cardAndCommentParamSchema,
} = require('../validators/comment.validator');

const router = express.Router();

router.get(
  '/cards/:cardId/comments',
  authenticate,
  validateParams(cardIdParamSchema),
  commentController.getCardComments
);

router.post(
  '/cards/:cardId/comments',
  authenticate,
  validateParams(cardIdParamSchema),
  validate(createCommentSchema),
  commentController.createComment
);

router.delete(
  '/cards/:cardId/comments/:commentId',
  authenticate,
  validateParams(cardAndCommentParamSchema),
  commentController.deleteComment
);

module.exports = router;
