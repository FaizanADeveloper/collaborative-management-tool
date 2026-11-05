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

/**
 * Update workspace metadata (owner/admin only)
 * PUT /api/workspaces/:id
 */
const updateWorkspace = asyncHandler(async (req, res) => {
  const result = await workspaceService.updateWorkspace(
    req.params.id,
    req.body,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Workspace updated successfully',
    data: {
      workspace: result,
    },
  });
});

/**
 * Delete workspace (owner only)
 * DELETE /api/workspaces/:id
 */
const deleteWorkspace = asyncHandler(async (req, res) => {
  await workspaceService.deleteWorkspace(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Workspace deleted successfully',
    data: null,
  });
});

/**
 * Generate or refresh workspace invitation code (owner/admin only)
 * POST /api/workspaces/:id/invite
 */
const generateInviteCode = asyncHandler(async (req, res) => {
  const result = await workspaceService.generateInviteCode(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Invitation code generated successfully',
    data: result,
  });
});

/**
 * Join workspace using an invitation code
 * POST /api/workspaces/join/:inviteCode
 */
const joinWorkspace = asyncHandler(async (req, res) => {
  const result = await workspaceService.joinWorkspaceByInviteCode(
    req.params.inviteCode,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Joined workspace successfully',
    data: {
      workspace: result,
    },
  });
});

/**
 * Remove a member from workspace or leave workspace
 * DELETE /api/workspaces/:id/members/:userId
 */
const removeWorkspaceMember = asyncHandler(async (req, res) => {
  await workspaceService.removeWorkspaceMember(
    req.params.id,
    req.params.userId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Workspace member removed successfully',
    data: null,
  });
});

/**
 * Get all members belonging to a workspace
 * GET /api/workspaces/:id/members
 */
const getWorkspaceMembers = asyncHandler(async (req, res) => {
  const result = await workspaceService.getWorkspaceMembers(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Workspace members retrieved successfully',
    data: {
      members: result,
    },
  });
});

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  updateWorkspace,
  deleteWorkspace,
  generateInviteCode,
  joinWorkspace,
  removeWorkspaceMember,
};
