const List = require('../models/List');
const Board = require('../models/Board');
const Card = require('../models/Card');
const WorkspaceMember = require('../models/WorkspaceMember');
const ApiError = require('../utils/ApiError');

/**
 * Create a new list inside a board
 * Computes position at the end (+1000) when not explicitly provided
 *
 * Note on concurrency: Simultaneous creations can read the same highest position
 * and receive identical position values; the compound sorting tie-breaker
 * ({ position: 1, createdAt: 1 }) ensures deterministic ordering across queries,
 * but does not guarantee unique positions.
 *
 * @param {string|mongoose.Types.ObjectId} boardId - Board ID
 * @param {object} data - List data { name, position? }
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Created list document
 */
const createList = async (boardId, { name, position }, userId) => {
  const board = await Board.findById(boardId);
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

  let listPosition = position;
  if (listPosition === undefined) {
    const highestList = await List.findOne({ board: boardId })
      .sort({ position: -1 })
      .select('position');

    listPosition = highestList != null ? highestList.position + 1000 : 1000;
  }

  const list = await List.create({
    name,
    board: boardId,
    position: listPosition,
  });

  return list.toJSON ? list.toJSON() : list;
};

/**
 * Retrieve all lists belonging to a board in deterministic position order
 *
 * @param {string|mongoose.Types.ObjectId} boardId - Board ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<Array<object>>} List of list documents
 */
const getBoardLists = async (boardId, userId) => {
  const board = await Board.findById(boardId);
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

  const lists = await List.find({ board: boardId }).sort({ position: 1, createdAt: 1 });

  return lists.map((l) => (l.toJSON ? l.toJSON() : l));
};

/**
 * Update a list's name and/or position
 *
 * @param {string|mongoose.Types.ObjectId} listId - List ID
 * @param {object} data - Update data { name?, position? }
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Updated list document
 */
const updateList = async (listId, data, userId) => {
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

  if (data.name !== undefined) {
    list.name = data.name;
  }

  if (data.position !== undefined) {
    list.position = data.position;
  }

  await list.save();

  return list.toJSON ? list.toJSON() : list;
};

/**
 * Delete a list
 *
 * @param {string|mongoose.Types.ObjectId} listId - List ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<null>}
 */
const deleteList = async (listId, userId) => {
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

  // Cascade delete child cards
  await Card.deleteMany({ list: listId });

  await List.findByIdAndDelete(listId);

  return null;
};

module.exports = {
  createList,
  getBoardLists,
  updateList,
  deleteList,
};
