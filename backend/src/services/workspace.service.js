const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Board = require('../models/Board');
const List = require('../models/List');
const ApiError = require('../utils/ApiError');

/**
 * Generate a random URL-safe invitation code
 * @returns {string} 12-character hex string
 */
const generateCode = () => crypto.randomBytes(6).toString('hex');

/**
 * Create a new workspace and automatically assign the creator as owner member
 * Implements compensation cleanup to avoid orphaned workspaces if membership fails
 *
 * @param {object} data - Workspace data { name, description }
 * @param {string|mongoose.Types.ObjectId} userId - Creator's user ID
 * @returns {Promise<object>} Created workspace object
 */
const createWorkspace = async ({ name, description }, userId) => {
  const inviteCode = generateCode();

  const workspace = await Workspace.create({
    name,
    description: description || '',
    owner: userId,
    inviteCode,
  });

  try {
    await WorkspaceMember.create({
      workspace: workspace._id,
      user: userId,
      role: 'owner',
    });
  } catch (memberError) {
    // Compensation cleanup: remove created workspace if member record fails
    try {
      await Workspace.findByIdAndDelete(workspace._id);
    } catch (rollbackError) {
      console.error(
        `CRITICAL: Failed to clean up orphaned workspace ${workspace._id} after membership creation failure:`,
        rollbackError
      );
    }
    throw memberError;
  }

  const serialized = workspace.toJSON ? workspace.toJSON() : workspace;
  return {
    ...serialized,
    role: 'owner',
  };
};

/**
 * Retrieve all workspaces the authenticated user belongs to
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<Array<object>>} List of workspaces with user's role
 */
const getUserWorkspaces = async (userId) => {
  const memberships = await WorkspaceMember.find({ user: userId })
    .populate('workspace')
    .sort({ joinedAt: -1 });

  return memberships
    .filter((member) => member.workspace != null)
    .map((member) => {
      const ws = member.workspace.toJSON
        ? member.workspace.toJSON()
        : member.workspace;

      return {
        ...ws,
        role: member.role,
        joinedAt: member.joinedAt,
      };
    });
};

/**
 * Retrieve workspace details if the authenticated user is an authorized member
 * Includes populated owner and active workspace members list
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Workspace details with user's role and members
 */
const getWorkspaceById = async (workspaceId, userId) => {
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

  // Populate owner details only after membership verification succeeds
  await workspace.populate('owner', 'name email avatar');

  const ws = workspace.toJSON ? workspace.toJSON() : workspace;
  return {
    ...ws,
    role: membership.role,
    joinedAt: membership.joinedAt,
  };
};

/**
 * Update workspace metadata (owner or admin only)
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {object} data - { name?, description? }
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user's ID
 * @returns {Promise<object>} Updated workspace
 */
const updateWorkspace = async (workspaceId, data, userId) => {
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

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw ApiError.forbidden('Access denied. Only workspace owners and admins can update workspace details.');
  }

  if (data.name !== undefined) {
    workspace.name = data.name;
  }
  if (data.description !== undefined) {
    workspace.description = data.description;
  }

  await workspace.save();

  const ws = workspace.toJSON ? workspace.toJSON() : workspace;
  return {
    ...ws,
    role: membership.role,
  };
};

/**
 * Delete a workspace and cascade delete all its boards, lists, and memberships (owner only)
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user's ID
 * @returns {Promise<null>}
 */
const deleteWorkspace = async (workspaceId, userId) => {
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

  if (membership.role !== 'owner') {
    throw ApiError.forbidden('Access denied. Only the workspace owner can delete this workspace.');
  }

  // Find all boards belonging to this workspace
  const boards = await Board.find({ workspace: workspaceId }).select('_id');
  const boardIds = boards.map((b) => b._id);

  // Cascade delete lists in these boards
  if (boardIds.length > 0) {
    await List.deleteMany({ board: { $in: boardIds } });
  }

  // Cascade delete all boards in this workspace
  await Board.deleteMany({ workspace: workspaceId });

  // Cascade delete all memberships in this workspace
  await WorkspaceMember.deleteMany({ workspace: workspaceId });

  // Delete the workspace document
  await Workspace.findByIdAndDelete(workspaceId);

  return null;
};

/**
 * Generate or refresh workspace invitation code (owner or admin only)
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {string|mongoose.Types.ObjectId} userId - Requesting user's ID
 * @returns {Promise<object>} { inviteCode }
 */
const generateInviteCode = async (workspaceId, userId) => {
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

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw ApiError.forbidden('Access denied. Only workspace owners and admins can generate invitation codes.');
  }

  const newCode = generateCode();
  workspace.inviteCode = newCode;
  await workspace.save();

  return {
    inviteCode: newCode,
  };
};

/**
 * Join a workspace using an invitation code
 * Prevents duplicate membership
 *
 * @param {string} inviteCode - Workspace invitation code
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Joined workspace details
 */
const joinWorkspaceByInviteCode = async (inviteCode, userId) => {
  const workspace = await Workspace.findOne({ inviteCode });

  if (!workspace) {
    throw ApiError.notFound('Invalid or expired invitation code');
  }

  const existingMember = await WorkspaceMember.findOne({
    workspace: workspace._id,
    user: userId,
  });

  if (existingMember) {
    throw ApiError.conflict('You are already a member of this workspace');
  }

  const membership = await WorkspaceMember.create({
    workspace: workspace._id,
    user: userId,
    role: 'member',
  });

  const ws = workspace.toJSON ? workspace.toJSON() : workspace;
  return {
    ...ws,
    role: membership.role,
    joinedAt: membership.joinedAt,
  };
};

/**
 * Remove a workspace member or leave a workspace
 * - Member can leave their own membership (unless they are owner)
 * - Owner or admin can remove members
 * - Owner cannot leave without transferring ownership or deleting workspace
 * - Admins cannot remove other admins or owner
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {string|mongoose.Types.ObjectId} targetUserId - User ID to remove
 * @param {string|mongoose.Types.ObjectId} requestingUserId - User ID performing the action
 * @returns {Promise<null>}
 */
const removeWorkspaceMember = async (workspaceId, targetUserId, requestingUserId) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw ApiError.notFound('Workspace not found');
  }

  const targetMember = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: targetUserId,
  });

  if (!targetMember) {
    throw ApiError.notFound('Workspace member not found');
  }

  const isSelf = targetUserId.toString() === requestingUserId.toString();

  if (isSelf) {
    // User leaving the workspace
    if (targetMember.role === 'owner') {
      throw ApiError.badRequest('Workspace owner cannot leave without transferring ownership or deleting the workspace.');
    }

    await WorkspaceMember.findByIdAndDelete(targetMember._id);
    return null;
  }

  // Removing another member - requires owner or admin
  const requestingMember = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: requestingUserId,
  });

  if (!requestingMember) {
    throw ApiError.forbidden('Access denied. You are not a member of this workspace.');
  }

  if (requestingMember.role !== 'owner' && requestingMember.role !== 'admin') {
    throw ApiError.forbidden('Access denied. Only workspace owners and admins can remove members.');
  }

  if (targetMember.role === 'owner') {
    throw ApiError.forbidden('Cannot remove the workspace owner.');
  }

  if (requestingMember.role === 'admin' && targetMember.role === 'admin') {
    throw ApiError.forbidden('Admins cannot remove other admins. Only the workspace owner can perform this action.');
  }

  await WorkspaceMember.findByIdAndDelete(targetMember._id);
  return null;
};

/**
 * Retrieve all members belonging to a workspace (workspace members only)
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<Array<object>>} List of workspace members
 */
const getWorkspaceMembers = async (workspaceId, userId) => {
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

  const members = await WorkspaceMember.find({ workspace: workspaceId })
    .populate('user', 'name email avatar')
    .sort({ joinedAt: 1 });

  return members
    .filter((m) => m.user != null)
    .map((m) => ({
      id: m.user._id ? m.user._id.toString() : m.user.toString(),
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
};

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  updateWorkspace,
  deleteWorkspace,
  generateInviteCode,
  joinWorkspaceByInviteCode,
  removeWorkspaceMember,
};
