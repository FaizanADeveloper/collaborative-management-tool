const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const ApiError = require('../utils/ApiError');

/**
 * Create a new workspace and automatically assign the creator as owner member
 * Implements compensation cleanup to avoid orphaned workspaces if membership fails
 *
 * @param {object} data - Workspace data { name, description }
 * @param {string|mongoose.Types.ObjectId} userId - Creator's user ID
 * @returns {Promise<object>} Created workspace object
 */
const createWorkspace = async ({ name, description }, userId) => {
  const workspace = await Workspace.create({
    name,
    description: description || '',
    owner: userId,
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
 *
 * @param {string|mongoose.Types.ObjectId} workspaceId - Workspace ID
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user's ID
 * @returns {Promise<object>} Workspace details with user's role
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

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
};
