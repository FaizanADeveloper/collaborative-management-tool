const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const WorkspaceMember = require('../models/WorkspaceMember');
const ApiError = require('../utils/ApiError');

/**
 * Create a new card in a list
 * Computes position at the end (+1000) when omitted
 *
 * @param {string|mongoose.Types.ObjectId} listId - List ID
 * @param {object} data - Card creation data
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Created card document
 */
const createCard = async (listId, data, userId) => {
  const list = await List.findById(listId);
  if (!list) {
    throw ApiError.notFound('List not found');
  }

  const board = await Board.findById(list.board);
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

  let cardPosition = data.position;
  if (cardPosition === undefined) {
    const highestCard = await Card.findOne({ list: listId })
      .sort({ position: -1 })
      .select('position');

    cardPosition = highestCard != null ? highestCard.position + 1000 : 1000;
  }

  const card = await Card.create({
    title: data.title,
    description: data.description || '',
    list: listId,
    board: board._id,
    position: cardPosition,
    priority: data.priority || 'medium',
    assignees: data.assignees || [],
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    labels: data.labels || [],
  });

  return card.toJSON ? card.toJSON() : card;
};

/**
 * Retrieve all cards in a list sorted by position and creation date
 *
 * @param {string|mongoose.Types.ObjectId} listId - List ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<Array<object>>} List of cards
 */
const getListCards = async (listId, userId) => {
  const list = await List.findById(listId);
  if (!list) {
    throw ApiError.notFound('List not found');
  }

  const board = await Board.findById(list.board);
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

  const cards = await Card.find({ list: listId })
    .sort({ position: 1, createdAt: 1 })
    .populate('assignees', 'name email avatar');

  return cards.map((c) => (c.toJSON ? c.toJSON() : c));
};

/**
 * Retrieve card details by ID with populated assignees
 *
 * @param {string|mongoose.Types.ObjectId} cardId - Card ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Card details
 */
const getCardById = async (cardId, userId) => {
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

  await card.populate('assignees', 'name email avatar');

  return card.toJSON ? card.toJSON() : card;
};

/**
 * Update card details
 *
 * @param {string|mongoose.Types.ObjectId} cardId - Card ID
 * @param {object} data - Update data
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Updated card details
 */
const updateCard = async (cardId, data, userId) => {
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

  if (data.title !== undefined) {
    card.title = data.title;
  }
  if (data.description !== undefined) {
    card.description = data.description;
  }
  if (data.position !== undefined) {
    card.position = data.position;
  }
  if (data.priority !== undefined) {
    card.priority = data.priority;
  }
  if (data.assignees !== undefined) {
    card.assignees = data.assignees;
  }
  if (data.dueDate !== undefined) {
    card.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.labels !== undefined) {
    card.labels = data.labels;
  }

  await card.save();
  await card.populate('assignees', 'name email avatar');

  return card.toJSON ? card.toJSON() : card;
};

/**
 * Delete a card
 *
 * @param {string|mongoose.Types.ObjectId} cardId - Card ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<null>}
 */
const deleteCard = async (cardId, userId) => {
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

  await Card.findByIdAndDelete(cardId);

  return null;
};

/**
 * Move a card within the same list or to another list on the same board, updating position
 *
 * @param {string|mongoose.Types.ObjectId} cardId - Card ID to move
 * @param {object} data - { destinationListId, position }
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user's ID
 * @returns {Promise<object>} Moved card document
 */
const moveCard = async (cardId, { destinationListId, position }, userId) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw ApiError.notFound('Card not found');
  }

  const destinationList = await List.findById(destinationListId);
  if (!destinationList) {
    throw ApiError.notFound('Destination list not found');
  }

  // Cross-board isolation check: destination list must belong to the same board as the card
  if (destinationList.board.toString() !== card.board.toString()) {
    throw ApiError.badRequest('Destination list must belong to the same board');
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

  card.list = destinationListId;
  card.position = position;

  await card.save();
  await card.populate('assignees', 'name email avatar');

  return card.toJSON ? card.toJSON() : card;
};

module.exports = {
  createCard,
  getListCards,
  getCardById,
  updateCard,
  deleteCard,
  moveCard,
};
