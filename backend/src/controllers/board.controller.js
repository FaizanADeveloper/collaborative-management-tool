const boardService = require('../services/board.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new board in a workspace
 * POST /api/workspaces/:workspaceId/boards
 */
const createBoard = asyncHandler(async (req, res) => {
  const result = await boardService.createBoard(
    req.params.workspaceId,
    req.body,
    req.user._id
  );

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'Board created successfully',
    data: {
      board: result,
    },
  });
});

/**
 * Get all boards in a workspace
 * GET /api/workspaces/:workspaceId/boards
 */
const getWorkspaceBoards = asyncHandler(async (req, res) => {
  const result = await boardService.getWorkspaceBoards(
    req.params.workspaceId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Boards retrieved successfully',
    data: {
      boards: result,
    },
  });
});

/**
 * Get board details by ID
 * GET /api/boards/:id
 */
const getBoardById = asyncHandler(async (req, res) => {
  const result = await boardService.getBoardById(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Board retrieved successfully',
    data: {
      board: result,
    },
  });
});

module.exports = {
  createBoard,
  getWorkspaceBoards,
  getBoardById,
};
