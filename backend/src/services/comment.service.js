const Comment = require('../models/Comment');
const Card = require('../models/Card');
const Board = require('../models/Board');
const WorkspaceMember = require('../models/WorkspaceMember');
const ApiError = require('../utils/ApiError');

/**
 * Retrieve all comments for a specific card in chronological order
 *
 * @param {string|mongoose.Types.ObjectId} cardId - Card ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<Array<object>>} List of comment documents
 */
const getCardComments = async (cardId, userId) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw ApiError.notFound('Card not found');
  }

  const board = await Board.findById(card.board);
  if (!board) {
    throw ApiError.notFound('Board not found');
  }

  const membership = await WorkspaceMember.findOne({
    workspace: board.workspace,
    user: userId,
  });
  if (!membership) {
    throw ApiError.forbidden('Access denied. You are not a member of this workspace.');
  }

  const comments = await Comment.find({ card: cardId })
    .sort({ createdAt: 1 })
    .populate('author', 'name avatar');

  return comments.map((c) => (c.toJSON ? c.toJSON() : c));
};

/**
 * Create a new comment on a card
 *
 * @param {string|mongoose.Types.ObjectId} cardId - Card ID
 * @param {object} data - { content }
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Created comment document
 */
const createComment = async (cardId, data, userId) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw ApiError.notFound('Card not found');
  }

  const board = await Board.findById(card.board);
  if (!board) {
    throw ApiError.notFound('Board not found');
  }

  const membership = await WorkspaceMember.findOne({
    workspace: board.workspace,
    user: userId,
  });
  if (!membership) {
    throw ApiError.forbidden('Access denied. You are not a member of this workspace.');
  }

  const comment = await Comment.create({
    card: card._id,
    board: board._id,
    workspace: board.workspace,
    author: userId,
    content: data.content,
  });

  await comment.populate('author', 'name avatar');

  const serialized = comment.toJSON ? comment.toJSON() : comment;
  return serialized;
};

/**
 * Delete a comment from a card
 * Restricts deletion to comment author or workspace owners/admins
 *
 * @param {string|mongoose.Types.ObjectId} cardId - Card ID
 * @param {string|mongoose.Types.ObjectId} commentId - Comment ID
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user's ID
 * @returns {Promise<null>}
 */
const deleteComment = async (cardId, commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw ApiError.notFound('Comment not found');
  }

  if (comment.card.toString() !== String(cardId)) {
    throw ApiError.notFound('Comment does not belong to this card');
  }

  const card = await Card.findById(cardId);
  if (!card) {
    throw ApiError.notFound('Card not found');
  }

  const board = await Board.findById(card.board);
  if (!board) {
    throw ApiError.notFound('Board not found');
  }

  const membership = await WorkspaceMember.findOne({
    workspace: board.workspace,
    user: userId,
  });
  if (!membership) {
    throw ApiError.forbidden('Access denied. You are not a member of this workspace.');
  }

  const isAuthor = comment.author.toString() === userId.toString();
  const isPrivileged = membership.role === 'owner' || membership.role === 'admin';

  if (!isAuthor && !isPrivileged) {
    throw ApiError.forbidden(
      'Access denied. You can only delete your own comments unless you are a workspace owner or admin.'
    );
  }

  await Comment.findByIdAndDelete(commentId);
  return null;
};

module.exports = {
  getCardComments,
  createComment,
  deleteComment,
};
