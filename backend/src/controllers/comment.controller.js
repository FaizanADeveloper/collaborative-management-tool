const commentService = require('../services/comment.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Retrieve all comments for a card
 * GET /api/cards/:cardId/comments
 */
const getCardComments = asyncHandler(async (req, res) => {
  const result = await commentService.getCardComments(req.params.cardId, req.user._id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Comments retrieved successfully',
    data: {
      comments: result,
    },
  });
});

/**
 * Create a new comment on a card
 * POST /api/cards/:cardId/comments
 */
const createComment = asyncHandler(async (req, res) => {
  const result = await commentService.createComment(
    req.params.cardId,
    req.body,
    req.user._id
  );

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'Comment added successfully',
    data: {
      comment: result,
    },
  });
});

/**
 * Delete a comment from a card
 * DELETE /api/cards/:cardId/comments/:commentId
 */
const deleteComment = asyncHandler(async (req, res) => {
  await commentService.deleteComment(
    req.params.cardId,
    req.params.commentId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Comment deleted successfully',
    data: null,
  });
});

module.exports = {
  getCardComments,
  createComment,
  deleteComment,
};
