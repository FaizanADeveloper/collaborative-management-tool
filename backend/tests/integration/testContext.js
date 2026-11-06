const crypto = require('crypto');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../src/config/db');
const User = require('../../src/models/User');
const Workspace = require('../../src/models/Workspace');
const WorkspaceMember = require('../../src/models/WorkspaceMember');

/**
 * Creates an isolated, non-destructive test execution context for a live test run
 * Enforces strict tracking, validation, and scoped cleanup of test-generated records only.
 */
function createTestContext() {
  const runId = crypto.randomBytes(4).toString('hex');
  const testEmailDomain = '@test-integration.internal';
  const testWorkspacePrefix = `[AUTOTEST-${runId}]`;

  // In-memory registry of IDs created strictly during this test session
  const createdUserIds = new Set();
  const createdWorkspaceIds = new Set();
  const createdMembershipIds = new Set();

  /**
   * Generates a collision-proof test email containing the runId and test domain
   * @param {string} label - Unique descriptor (e.g. 'owner', 'member')
   * @returns {string} e.g. autotest.8f2a1b.owner.1730900000000@test-integration.internal
   */
  const generateTestEmail = (label = 'user') => {
    const timestamp = Date.now();
    const entropy = crypto.randomBytes(2).toString('hex');
    return `autotest.${runId}.${label}.${timestamp}.${entropy}${testEmailDomain}`.toLowerCase();
  };

  /**
   * Generates a collision-proof test workspace name with the runId prefix
   * @param {string} label - Descriptive name
   * @returns {string} e.g. [AUTOTEST-8f2a1b] Engineering Hub
   */
  const generateTestWorkspaceName = (label = 'Team Workspace') => {
    return `${testWorkspacePrefix} ${label}`;
  };

  /**
   * Immediately registers a created user ID into this run's tracking registry
   * @param {string|mongoose.Types.ObjectId} id
   */
  const registerUserId = (id) => {
    if (id) {
      createdUserIds.add(id.toString());
    }
  };

  /**
   * Immediately registers a created workspace ID into this run's tracking registry
   * @param {string|mongoose.Types.ObjectId} id
   */
  const registerWorkspaceId = (id) => {
    if (id) {
      createdWorkspaceIds.add(id.toString());
    }
  };

  /**
   * Immediately registers a created membership ID into this run's tracking registry
   * @param {string|mongoose.Types.ObjectId} id
   */
  const registerMembershipId = (id) => {
    if (id) {
      createdMembershipIds.add(id.toString());
    }
  };

  /**
   * Captures snapshots of existing non-test records (e.g., Postman data)
   * used to assert that live testing does not delete or alter pre-existing records.
   */
  const captureExistingState = async () => {
    // Locate non-test users and workspaces in the database
    const existingUsers = await User.find({
      email: { $not: new RegExp(`${testEmailDomain.replace('.', '\\.')}$`, 'i') },
    }).select('_id name email createdAt updatedAt');

    const existingWorkspaces = await Workspace.find({
      name: { $not: /^\[AUTOTEST-/ },
    }).select('_id name owner inviteCode createdAt updatedAt');

    return {
      users: existingUsers.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
      })),
      workspaces: existingWorkspaces.map((w) => ({
        id: w._id.toString(),
        name: w.name,
        owner: w.owner.toString(),
        createdAt: w.createdAt.toISOString(),
      })),
    };
  };

  /**
   * Verifies that pre-existing non-test records remain completely intact after test execution
   * @param {object} baseline - Object returned by captureExistingState()
   */
  const verifyPreservation = async (baseline) => {
    if (!baseline) return;

    for (const expectedUser of baseline.users) {
      const liveUser = await User.findById(expectedUser.id);
      if (!liveUser) {
        throw new Error(
          `[PRESERVATION FAILURE] Pre-existing non-test user "${expectedUser.email}" (${expectedUser.id}) was unexpectedly removed!`
        );
      }
      if (liveUser.email !== expectedUser.email || liveUser.name !== expectedUser.name) {
        throw new Error(
          `[PRESERVATION FAILURE] Pre-existing non-test user "${expectedUser.email}" (${expectedUser.id}) was modified!`
        );
      }
    }

    for (const expectedWs of baseline.workspaces) {
      const liveWs = await Workspace.findById(expectedWs.id);
      if (!liveWs) {
        throw new Error(
          `[PRESERVATION FAILURE] Pre-existing non-test workspace "${expectedWs.name}" (${expectedWs.id}) was unexpectedly removed!`
        );
      }
      if (liveWs.name !== expectedWs.name || liveWs.owner.toString() !== expectedWs.owner) {
        throw new Error(
          `[PRESERVATION FAILURE] Pre-existing non-test workspace "${expectedWs.name}" (${expectedWs.id}) was modified!`
        );
      }
    }
  };

  /**
   * Strictly scoped, dual-verified cleanup:
   * 1. Only targets IDs explicitly registered in this test run's Set.
   * 2. Inspects each candidate document before deletion to verify its unique test marker.
   * 3. Aborts immediately if any candidate does not match its test marker.
   * 4. Never issues broad or unparameterized delete queries.
   */
  const cleanupRegisteredRecords = async () => {
    // 1. Clean up tracked WorkspaceMembers first (memberships referencing tracked workspaces or users)
    const trackedWsIds = Array.from(createdWorkspaceIds);
    const trackedUIds = Array.from(createdUserIds);

    if (trackedWsIds.length > 0 || trackedUIds.length > 0) {
      const candidateMemberships = await WorkspaceMember.find({
        $or: [
          ...(trackedWsIds.length > 0 ? [{ workspace: { $in: trackedWsIds } }] : []),
          ...(trackedUIds.length > 0 ? [{ user: { $in: trackedUIds } }] : []),
        ],
      });

      for (const mem of candidateMemberships) {
        const wsIdStr = mem.workspace.toString();
        const uIdStr = mem.user.toString();
        const isTrackedWs = createdWorkspaceIds.has(wsIdStr);
        const isTrackedUser = createdUserIds.has(uIdStr);

        // Verification safety guard: member must belong to a tracked workspace or tracked test user
        if (!isTrackedWs && !isTrackedUser) {
          throw new Error(
            `[SAFETY ABORT] Membership ${mem._id} does not link to a tracked test entity. Deletion aborted.`
          );
        }

        await WorkspaceMember.deleteOne({ _id: mem._id });
      }
    }

    // 2. Clean up tracked Workspaces
    for (const wsId of createdWorkspaceIds) {
      const ws = await Workspace.findById(wsId);
      if (!ws) continue;

      // Verification safety guard: must have the exact run prefix
      if (!ws.name.startsWith(testWorkspacePrefix)) {
        throw new Error(
          `[SAFETY ABORT] Workspace ${wsId} ("${ws.name}") does not match test prefix "${testWorkspacePrefix}". Deletion aborted.`
        );
      }

      await Workspace.deleteOne({ _id: ws._id });
    }

    // 3. Clean up tracked Users
    for (const uId of createdUserIds) {
      const u = await User.findById(uId);
      if (!u) continue;

      // Verification safety guard: must have the exact test domain and runId
      if (!u.email.endsWith(testEmailDomain) || !u.email.includes(runId)) {
        throw new Error(
          `[SAFETY ABORT] User ${uId} ("${u.email}") does not match test email pattern. Deletion aborted.`
        );
      }

      await User.deleteOne({ _id: u._id });
    }

    // Clear tracking sets after successful verified cleanup
    createdWorkspaceIds.clear();
    createdUserIds.clear();
    createdMembershipIds.clear();
  };

  return {
    runId,
    testEmailDomain,
    testWorkspacePrefix,
    generateTestEmail,
    generateTestWorkspaceName,
    registerUserId,
    registerWorkspaceId,
    registerMembershipId,
    captureExistingState,
    verifyPreservation,
    cleanupRegisteredRecords,
  };
}

module.exports = {
  createTestContext,
  connectDB,
  disconnectDB,
};
