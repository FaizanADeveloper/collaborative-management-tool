const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const ApiError = require('../utils/ApiError');

/**
 * Create a new board within a workspace
 * Whitelists allowed input fields and enforces authenticated user as creator
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {object} data - Board data { name, description }
 * @param {string|mongoose.Types.ObjectId} userId - Creator's user ID
 * @returns {Promise<object>} Created board document
 */
const createBoard = async (workspaceId, { name, description }, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw ApiError.notFound('Workspace not found');
  }

  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });
  if (!membership) {
    throw ApiError.forbidden('Access denied. You are not a member of this workspace.');
  }

  const board = await Board.create({
    name,
    description: description || '',
    workspace: workspaceId,
    createdBy: userId,
  });

  return board.toJSON ? board.toJSON() : board;
};

/**
 * Retrieve all boards belonging to a workspace
 * Strictly scopes query to the requested workspace
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<Array<object>>} List of boards
 */
const getWorkspaceBoards = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw ApiError.notFound('Workspace not found');
  }

  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
  });
  if (!membership) {
    throw ApiError.forbidden('Access denied. You are not a member of this workspace.');
  }

  const boards = await Board.find({ workspace: workspaceId }).sort({ createdAt: -1 });

  return boards.map((b) => (b.toJSON ? b.toJSON() : b));
};

/**
 * Retrieve board details by ID
 * Verifies membership in the parent workspace before populating user details
 *
 * @param {string|mongoose.Types.ObjectId} boardId - Board ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Board details
 */
const getBoardById = async (boardId, userId) => {
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

  // Populate creator details only after membership check succeeds
  await board.populate('createdBy', 'name email avatar');

  return board.toJSON ? board.toJSON() : board;
};

module.exports = {
  createBoard,
  getWorkspaceBoards,
  getBoardById,
};
