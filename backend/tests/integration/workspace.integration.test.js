const request = require('supertest');
const app = require('../../src/app');
const Workspace = require('../../src/models/Workspace');
const WorkspaceMember = require('../../src/models/WorkspaceMember');
const { createTestContext, connectDB, disconnectDB } = require('./testContext');

describe('Live MongoDB Atlas Integration Tests: Workspace & Membership APIs', () => {
  let context;
  let baselineState;
  const testPassword = 'AtlasWorkspacePass2026!';

  let ownerUserId;
  let ownerToken;

  let outsiderUserId;
  let outsiderToken;

  beforeAll(async () => {
    // 1. Establish live connection to Atlas
    await connectDB();

    // 2. Instantiate isolated test context with unique runId
    context = createTestContext();

    // 3. Capture baseline snapshot of pre-existing records (Postman data)
    baselineState = await context.captureExistingState();

    // 4. Create primary workspace owner user
    const ownerEmail = context.generateTestEmail('wsowner');
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Workspace Owner User',
        email: ownerEmail,
        password: testPassword,
        avatar: 'https://example.com/owner.png',
      });

    if (ownerRes.body && ownerRes.body.data && ownerRes.body.data.user && ownerRes.body.data.user.id) {
      context.registerUserId(ownerRes.body.data.user.id);
    }
    expect(ownerRes.status).toBe(201);
    ownerUserId = ownerRes.body.data.user.id;
    ownerToken = ownerRes.body.data.token;

    // 5. Create independent outsider user (used for authorization boundary checks)
    const outsiderEmail = context.generateTestEmail('outsider');
    const outsiderRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Outsider User',
        email: outsiderEmail,
        password: testPassword,
      });

    if (outsiderRes.body && outsiderRes.body.data && outsiderRes.body.data.user && outsiderRes.body.data.user.id) {
      context.registerUserId(outsiderRes.body.data.user.id);
    }
    expect(outsiderRes.status).toBe(201);
    outsiderUserId = outsiderRes.body.data.user.id;
    outsiderToken = outsiderRes.body.data.token;
  }, 15000);

  afterAll(async () => {
    let preservationError;
    try {
      // 1. First attempt to assert that pre-existing non-test records remained completely untouched
      if (context && baselineState) {
        await context.verifyPreservation(baselineState);
      }
    } catch (err) {
      preservationError = err;
    } finally {
      let cleanupError;
      try {
        // 2. Put cleanup inside nested finally so it executes even if preservation check fails
        if (context) {
          await context.cleanupRegisteredRecords();
        }
      } catch (err) {
        cleanupError = err;
      } finally {
        // 3. Put disconnectDB in outer finally so it executes even if cleanup fails
        await disconnectDB();
      }

      // Do not suppress or silently swallow errors
      if (preservationError) {
        throw preservationError;
      }
      if (cleanupError) {
        throw cleanupError;
      }
    }
  }, 15000);

  describe('POST /api/workspaces (Live Atlas)', () => {
    it('should persist workspace in Atlas, generate invite code, and automatically create owner membership', async () => {
      const workspaceName = context.generateTestWorkspaceName('Core Engineering');
      const payload = {
        name: workspaceName,
        description: 'Automated live testing for agile workspace',
      };

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(payload);

      // Register created ID immediately before assertions
      if (res.body && res.body.data && res.body.data.workspace && res.body.data.workspace.id) {
        context.registerWorkspaceId(res.body.data.workspace.id);
      }

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('workspace');

      const workspaceId = res.body.data.workspace.id;
      expect(workspaceId).toBeDefined();

      // Verify workspace document persistence in Atlas
      const atlasWs = await Workspace.findById(workspaceId);
      expect(atlasWs).not.toBeNull();
      expect(atlasWs.name).toBe(workspaceName);
      expect(atlasWs.owner.toString()).toBe(ownerUserId);
      expect(atlasWs.inviteCode).toBeDefined();
      expect(atlasWs.inviteCode).toMatch(/^[a-f0-9]{12}$/);

      // Verify automatic owner membership creation in Atlas workspacemembers collection
      const atlasMember = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: ownerUserId,
      });

      expect(atlasMember).not.toBeNull();
      expect(atlasMember.role).toBe('owner');
    });
  });

  describe('GET /api/workspaces/:id (Live Atlas)', () => {
    let targetWorkspaceId;
    let targetWorkspaceName;

    beforeAll(async () => {
      targetWorkspaceName = context.generateTestWorkspaceName('Inspection Pod');
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: targetWorkspaceName,
          description: 'Used for detail retrieval and access control',
        });

      // Register created ID immediately before assertions
      if (res.body && res.body.data && res.body.data.workspace && res.body.data.workspace.id) {
        targetWorkspaceId = res.body.data.workspace.id;
        context.registerWorkspaceId(targetWorkspaceId);
      }

      expect(res.status).toBe(201);
    });

    it('should retrieve workspace and populate live owner details for authorized member', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${targetWorkspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.workspace.id).toBe(targetWorkspaceId);
      expect(res.body.data.workspace.name).toBe(targetWorkspaceName);

      // Verify owner population from Atlas users collection
      expect(res.body.data.workspace).toHaveProperty('owner');
      expect(res.body.data.workspace.owner.id).toBe(ownerUserId);
      expect(res.body.data.workspace.owner.name).toBe('Workspace Owner User');
      expect(res.body.data.workspace.owner.avatar).toBe('https://example.com/owner.png');
    });

    it('should enforce tenant isolation and return HTTP 403 Forbidden for non-member', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${targetWorkspaceId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not a member/i);
    });
  });

  describe('GET /api/workspaces (Live Atlas)', () => {
    it('should return workspaces belonging to authenticated user and isolate other users', async () => {
      const ownerListRes = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(ownerListRes.status).toBe(200);
      expect(ownerListRes.body.data).toHaveProperty('workspaces');
      expect(Array.isArray(ownerListRes.body.data.workspaces)).toBe(true);

      // Verify owner sees their created workspaces
      const ownerWorkspaceIds = ownerListRes.body.data.workspaces.map((w) => w.id);
      expect(ownerWorkspaceIds.length).toBeGreaterThanOrEqual(1);

      // Outsider should see none of the owner's workspaces
      const outsiderListRes = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(outsiderListRes.status).toBe(200);
      const outsiderWorkspaceIds = outsiderListRes.body.data.workspaces.map((w) => w.id);
      for (const id of ownerWorkspaceIds) {
        expect(outsiderWorkspaceIds).not.toContain(id);
      }
    });
  });

  describe('Preservation Verification (Live Atlas)', () => {
    it('should confirm that pre-existing Postman records remain intact throughout test run', async () => {
      await context.verifyPreservation(baselineState);
    });
  });
});
