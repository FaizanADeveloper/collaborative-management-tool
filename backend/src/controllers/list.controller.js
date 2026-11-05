const listService = require('../services/list.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new list in a board
 * POST /api/boards/:boardId/lists
 */
const createList = asyncHandler(async (req, res) => {
  const result = await listService.createList(
    req.params.boardId,
    req.body,
    req.user._id
  );

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'List created successfully',
    data: {
      list: result,
    },
  });
});

/**
 * Get all lists in a board
 * GET /api/boards/:boardId/lists
 */
const getBoardLists = asyncHandler(async (req, res) => {
  const result = await listService.getBoardLists(
    req.params.boardId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Lists retrieved successfully',
    data: {
      lists: result,
    },
  });
});

/**
 * Update list name and/or position
 * PATCH /api/lists/:id
 */
const updateList = asyncHandler(async (req, res) => {
  const result = await listService.updateList(
    req.params.id,
    req.body,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'List updated successfully',
    data: {
      list: result,
    },
  });
});

/**
 * Delete a list
 * DELETE /api/lists/:id
 */
const deleteList = asyncHandler(async (req, res) => {
  await listService.deleteList(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'List deleted successfully',
    data: null,
  });
});

module.exports = {
  createList,
  getBoardLists,
  updateList,
  deleteList,
};
