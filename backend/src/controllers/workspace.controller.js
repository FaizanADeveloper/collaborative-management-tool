const workspaceService = require('../services/workspace.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new workspace
 * POST /api/workspaces
 */
const createWorkspace = asyncHandler(async (req, res) => {
  const result = await workspaceService.createWorkspace(req.body, req.user._id);

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'Workspace created successfully',
    data: {
      workspace: result,
    },
  });
});

/**
 * Get all workspaces the authenticated user belongs to
 * GET /api/workspaces
 */
const getUserWorkspaces = asyncHandler(async (req, res) => {
  const result = await workspaceService.getUserWorkspaces(req.user._id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Workspaces retrieved successfully',
    data: {
      workspaces: result,
    },
  });
});

/**
 * Get workspace details by ID for an authorized member
 * GET /api/workspaces/:id
 */
const getWorkspaceById = asyncHandler(async (req, res) => {
  const result = await workspaceService.getWorkspaceById(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Workspace retrieved successfully',
    data: {
      workspace: result,
    },
  });
});

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
};
