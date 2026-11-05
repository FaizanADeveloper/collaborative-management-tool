const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Workspace = require('../src/models/Workspace');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const Board = require('../src/models/Board');
const List = require('../src/models/List');
const Card = require('../src/models/Card');
const { generateToken } = require('../src/utils/token');

describe('Milestone 05A: Workspace Foundation', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockUser = new User({
    _id: mockUserId,
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://example.com/avatar.png',
  });

  const authToken = generateToken(mockUserId.toString());

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Workspace & WorkspaceMember Model Schema Validation', () => {
    it('should validate a valid Workspace object successfully', async () => {
      const workspace = new Workspace({
        name: 'Engineering Hub',
        description: 'Main collaborative workspace for engineering',
        owner: mockUserId,
      });

      await expect(workspace.validate()).resolves.toBeUndefined();
      expect(workspace.name).toBe('Engineering Hub');
      expect(workspace.description).toBe('Main collaborative workspace for engineering');
      expect(workspace.owner).toEqual(mockUserId);
    });

    it('should fail Workspace validation when name or owner is missing', async () => {
      const workspace = new Workspace({});
      let validationError;
      try {
        await workspace.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.owner).toBeDefined();
    });

    it('should fail Workspace validation when name is shorter than 2 characters', async () => {
      const workspace = new Workspace({
        name: 'A',
        owner: mockUserId,
      });

      let validationError;
      try {
        await workspace.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.name.message).toMatch(/at least 2 characters/);
    });

    it('should validate a valid WorkspaceMember object with default member role', async () => {
      const mockWorkspaceId = new mongoose.Types.ObjectId();
      const member = new WorkspaceMember({
        workspace: mockWorkspaceId,
        user: mockUserId,
      });

      await expect(member.validate()).resolves.toBeUndefined();
      expect(member.role).toBe('member');
      expect(member.joinedAt).toBeInstanceOf(Date);
    });

    it('should enforce role enum on WorkspaceMember', async () => {
      const mockWorkspaceId = new mongoose.Types.ObjectId();
      const member = new WorkspaceMember({
        workspace: mockWorkspaceId,
        user: mockUserId,
        role: 'invalid_role',
      });

      let validationError;
      try {
        await member.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.role).toBeDefined();
      expect(validationError.errors.role.message).toMatch(/owner, admin, or member/);
    });

    it('should have a compound unique index defined on workspace and user in WorkspaceMember', () => {
      const indexes = WorkspaceMember.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields, options]) =>
          fields.workspace === 1 && fields.user === 1 && options && options.unique === true
      );

      expect(compoundIndex).toBeDefined();
    });

    it('should transform _id to id and remove __v in toJSON for Workspace and WorkspaceMember', () => {
      const mockWsId = new mongoose.Types.ObjectId();
      const workspace = new Workspace({
        _id: mockWsId,
        name: 'Design System',
        owner: mockUserId,
      });

      const member = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: mockWsId,
        user: mockUserId,
        role: 'owner',
      });

      const wsJson = workspace.toJSON();
      expect(wsJson.id).toBe(mockWsId.toString());
      expect(wsJson._id).toBeUndefined();
      expect(wsJson.__v).toBeUndefined();

      const memberJson = member.toJSON();
      expect(memberJson.id).toBeDefined();
      expect(memberJson._id).toBeUndefined();
      expect(memberJson.__v).toBeUndefined();
    });
  });

  describe('POST /api/workspaces (Create Workspace)', () => {
    it('should successfully create a workspace and assign the creator as owner member', async () => {
      const mockWorkspaceId = new mongoose.Types.ObjectId();
      const mockCreatedWorkspace = new Workspace({
        _id: mockWorkspaceId,
        name: 'Product Squad',
        description: 'Roadmap and delivery tracking',
        owner: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockCreatedMember = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: mockWorkspaceId,
        user: mockUserId,
        role: 'owner',
        joinedAt: new Date(),
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'create').mockResolvedValue(mockCreatedWorkspace);
      jest.spyOn(WorkspaceMember, 'create').mockResolvedValue(mockCreatedMember);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Product Squad',
          description: 'Roadmap and delivery tracking',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'Workspace created successfully');
      expect(res.body.data).toHaveProperty('workspace');

      const { workspace } = res.body.data;
      expect(workspace).toHaveProperty('id', mockWorkspaceId.toString());
      expect(workspace).toHaveProperty('name', 'Product Squad');
      expect(workspace).toHaveProperty('role', 'owner');
      expect(workspace.owner.toString()).toBe(mockUserId.toString());

      // Confirm WorkspaceMember was created with owner role
      expect(WorkspaceMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace: mockWorkspaceId,
          user: mockUserId,
          role: 'owner',
        })
      );
    });

    it('should reject unauthenticated workspace creation with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .send({ name: 'Unauthorized Workspace' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/Access denied/);
    });

    it('should reject workspace creation when name is missing with HTTP 400', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'No name provided' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
        ])
      );
    });

    it('should reject workspace creation when name is shorter than 2 characters with HTTP 400', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
    });

    it('should prevent mass assignment of owner and role from request body', async () => {
      const forgedUserId = new mongoose.Types.ObjectId();
      const mockWorkspaceId = new mongoose.Types.ObjectId();

      const mockCreatedWorkspace = new Workspace({
        _id: mockWorkspaceId,
        name: 'Security Workspace',
        description: '',
        owner: mockUserId, // Must remain authenticated user
      });

      const mockCreatedMember = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: mockWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'create').mockResolvedValue(mockCreatedWorkspace);
      jest.spyOn(WorkspaceMember, 'create').mockResolvedValue(mockCreatedMember);

      await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Security Workspace',
          owner: forgedUserId.toString(),
          role: 'admin',
        });

      // Verify Workspace.create was invoked with the authenticated user ID as owner
      expect(Workspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: mockUserId,
        })
      );
    });

    it('should trigger compensation rollback (delete created workspace) if membership creation fails', async () => {
      const mockWorkspaceId = new mongoose.Types.ObjectId();
      const mockCreatedWorkspace = new Workspace({
        _id: mockWorkspaceId,
        name: 'Rollback Workspace',
        owner: mockUserId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'create').mockResolvedValue(mockCreatedWorkspace);
      jest.spyOn(WorkspaceMember, 'create').mockRejectedValue(new Error('Membership creation failed'));
      jest.spyOn(Workspace, 'findByIdAndDelete').mockResolvedValue(mockCreatedWorkspace);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Rollback Workspace' });

      expect(res.status).toBe(500);
      expect(Workspace.findByIdAndDelete).toHaveBeenCalledWith(mockWorkspaceId);
    });

    it('should preserve original membership error and log server-side if both membership creation and rollback fail', async () => {
      const mockWorkspaceId = new mongoose.Types.ObjectId();
      const mockCreatedWorkspace = new Workspace({
        _id: mockWorkspaceId,
        name: 'Failing Rollback Workspace',
        owner: mockUserId,
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'create').mockResolvedValue(mockCreatedWorkspace);
      jest.spyOn(WorkspaceMember, 'create').mockRejectedValue(new Error('Membership creation failed'));
      jest.spyOn(Workspace, 'findByIdAndDelete').mockRejectedValue(new Error('Rollback DB timeout'));

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Failing Rollback Workspace' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Membership creation failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Failed to clean up orphaned workspace'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/workspaces (List User Workspaces)', () => {
    it('should return workspaces the authenticated user belongs to with user role', async () => {
      const mockWorkspace1 = new Workspace({
        _id: new mongoose.Types.ObjectId(),
        name: 'Alpha Project',
        description: 'First workspace',
        owner: mockUserId,
      });

      const mockWorkspace2 = new Workspace({
        _id: new mongoose.Types.ObjectId(),
        name: 'Beta Project',
        description: 'Second workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      const mockMemberships = [
        {
          workspace: mockWorkspace1,
          role: 'owner',
          joinedAt: new Date(),
        },
        {
          workspace: mockWorkspace2,
          role: 'member',
          joinedAt: new Date(),
        },
      ];

      const mockFindQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMemberships),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(WorkspaceMember, 'find').mockReturnValue(mockFindQuery);

      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.message).toBe('Workspaces retrieved successfully');
      expect(res.body.data).toHaveProperty('workspaces');
      expect(res.body.data.workspaces).toHaveLength(2);
      expect(res.body.data.workspaces[0]).toHaveProperty('name', 'Alpha Project');
      expect(res.body.data.workspaces[0]).toHaveProperty('role', 'owner');
      expect(res.body.data.workspaces[1]).toHaveProperty('name', 'Beta Project');
      expect(res.body.data.workspaces[1]).toHaveProperty('role', 'member');
    });

    it('should reject unauthenticated workspace listing with HTTP 401', async () => {
      const res = await request(app).get('/api/workspaces');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/workspaces/:id (Get Workspace by ID)', () => {
    const targetWorkspaceId = new mongoose.Types.ObjectId();

    it('should return workspace details with populated owner details when authenticated user is a member', async () => {
      const mockOwnerUser = {
        id: mockUserId.toString(),
        name: 'Alex Morgan',
        email: 'alex.morgan@example.com',
        avatar: 'https://example.com/avatar.png',
      };

      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Marketing Launch',
        description: 'Q4 marketing campaigns',
        owner: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
        joinedAt: new Date(),
      });

      jest.spyOn(mockWorkspaceDoc, 'populate').mockImplementation(async function () {
        this._doc.owner = mockOwnerUser;
        return this;
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);

      const res = await request(app)
        .get(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('workspace');

      const { workspace } = res.body.data;
      expect(workspace).toHaveProperty('id', targetWorkspaceId.toString());
      expect(workspace).toHaveProperty('name', 'Marketing Launch');
      expect(workspace).toHaveProperty('role', 'owner');
      expect(workspace.owner).toHaveProperty('name', 'Alex Morgan');
      expect(mockWorkspaceDoc.populate).toHaveBeenCalledWith('owner', 'name email avatar');
    });

    it('should return HTTP 403 Forbidden without populating owner details when authenticated user is NOT a member', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Secret Workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(mockWorkspaceDoc, 'populate').mockResolvedValue(mockWorkspaceDoc);

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      // User has no membership record
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not a member/);

      // Verify that owner was NOT populated
      expect(mockWorkspaceDoc.populate).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 Not Found when workspace does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${nonExistentId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return HTTP 400 Bad Request when workspace ID is malformed', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/workspaces/invalid-workspace-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'id' }),
        ])
      );
    });
  });

  describe('GET /api/workspaces/:id/members (Get Workspace Members)', () => {
    const targetWorkspaceId = new mongoose.Types.ObjectId();

    it('should return all workspace members for an authorized member', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Dev Workspace',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      const mockMembersList = [
        {
          user: {
            _id: mockUserId,
            name: 'Alex Morgan',
            email: 'alex.morgan@example.com',
            avatar: 'https://example.com/avatar.png',
          },
          role: 'owner',
          joinedAt: new Date(),
        },
      ];

      const mockFindQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMembersList),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(WorkspaceMember, 'find').mockReturnValue(mockFindQuery);

      const res = await request(app)
        .get(`/api/workspaces/${targetWorkspaceId.toString()}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toHaveLength(1);
      expect(res.body.data.members[0]).toMatchObject({
        id: mockUserId.toString(),
        name: 'Alex Morgan',
        role: 'owner',
      });
    });

    it('should return HTTP 403 Forbidden when requesting user is NOT a member', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Private Workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${targetWorkspaceId.toString()}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });
  });

  describe('PUT /api/workspaces/:id (Update Workspace)', () => {
    const targetWorkspaceId = new mongoose.Types.ObjectId();

    it('should allow owner to update workspace details', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Original Name',
        description: 'Original Description',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockWorkspaceDoc, 'save').mockResolvedValue(mockWorkspaceDoc);

      const res = await request(app)
        .put(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name', description: 'Updated Description' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workspace.name).toBe('Updated Name');
      expect(res.body.data.workspace.description).toBe('Updated Description');
    });

    it('should allow admin to update workspace details', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Original Name',
        owner: new mongoose.Types.ObjectId(),
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'admin',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockWorkspaceDoc, 'save').mockResolvedValue(mockWorkspaceDoc);

      const res = await request(app)
        .put(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Admin Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.data.workspace.name).toBe('Admin Renamed');
    });

    it('should return HTTP 403 Forbidden when a regular member attempts to update workspace', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Original Name',
        owner: new mongoose.Types.ObjectId(),
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);

      const res = await request(app)
        .put(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Member Update Attempt' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only workspace owners and admins/);
    });

    it('should return HTTP 400 Bad Request when update payload is empty', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .put(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });
  });

  describe('DELETE /api/workspaces/:id (Delete Workspace & Cascading)', () => {
    const targetWorkspaceId = new mongoose.Types.ObjectId();

    it('should allow owner to delete workspace and cascade delete boards, lists, and memberships', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Doomed Workspace',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      const mockBoardId = new mongoose.Types.ObjectId();
      const mockBoards = [{ _id: mockBoardId }];

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Board, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBoards),
      });
      jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 12 });
      jest.spyOn(List, 'deleteMany').mockResolvedValue({ deletedCount: 5 });
      jest.spyOn(Board, 'deleteMany').mockResolvedValue({ deletedCount: 1 });
      jest.spyOn(WorkspaceMember, 'deleteMany').mockResolvedValue({ deletedCount: 3 });
      jest.spyOn(Workspace, 'findByIdAndDelete').mockResolvedValue(mockWorkspaceDoc);

      const res = await request(app)
        .delete(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Card.deleteMany).toHaveBeenCalledWith({ board: { $in: [mockBoardId] } });
      expect(List.deleteMany).toHaveBeenCalledWith({ board: { $in: [mockBoardId] } });
      expect(Board.deleteMany).toHaveBeenCalledWith({ workspace: targetWorkspaceId.toString() });
      expect(WorkspaceMember.deleteMany).toHaveBeenCalledWith({ workspace: targetWorkspaceId.toString() });
      expect(Workspace.findByIdAndDelete).toHaveBeenCalledWith(targetWorkspaceId.toString());
    });

    it('should safely delete workspace without error when workspace has no boards', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Empty Workspace',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Board, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
      jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
      jest.spyOn(List, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
      jest.spyOn(Board, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
      jest.spyOn(WorkspaceMember, 'deleteMany').mockResolvedValue({ deletedCount: 1 });
      jest.spyOn(Workspace, 'findByIdAndDelete').mockResolvedValue(mockWorkspaceDoc);

      const res = await request(app)
        .delete(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Card.deleteMany).not.toHaveBeenCalled();
      expect(List.deleteMany).not.toHaveBeenCalled();
      expect(Board.deleteMany).toHaveBeenCalledWith({ workspace: targetWorkspaceId.toString() });
      expect(WorkspaceMember.deleteMany).toHaveBeenCalledWith({ workspace: targetWorkspaceId.toString() });
      expect(Workspace.findByIdAndDelete).toHaveBeenCalledWith(targetWorkspaceId.toString());
    });

    it('should return HTTP 403 Forbidden when an admin attempts to delete workspace', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'admin',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);

      const res = await request(app)
        .delete(`/api/workspaces/${targetWorkspaceId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only the workspace owner/);
    });
  });

  describe('POST /api/workspaces/:id/invite (Generate / Refresh Invitation Code)', () => {
    const targetWorkspaceId = new mongoose.Types.ObjectId();

    it('should allow owner or admin to generate/refresh invitation code', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Invite Workspace',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockWorkspaceDoc, 'save').mockResolvedValue(mockWorkspaceDoc);

      const res = await request(app)
        .post(`/api/workspaces/${targetWorkspaceId.toString()}/invite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('inviteCode');
      expect(typeof res.body.data.inviteCode).toBe('string');
    });

    it('should return HTTP 403 Forbidden when regular member attempts to generate invite code', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);

      const res = await request(app)
        .post(`/api/workspaces/${targetWorkspaceId.toString()}/invite`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only workspace owners and admins/);
    });
  });

  describe('POST /api/workspaces/join/:inviteCode (Join Workspace via Invitation Code)', () => {
    const validInviteCode = 'a1b2c3d4e5f6';
    const targetWorkspaceId = new mongoose.Types.ObjectId();

    it('should allow user to join workspace with valid invitation code', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Joined Workspace',
        owner: new mongoose.Types.ObjectId(),
        inviteCode: validInviteCode,
      });

      const mockNewMembership = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findOne').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);
      jest.spyOn(WorkspaceMember, 'create').mockResolvedValue(mockNewMembership);

      const res = await request(app)
        .post(`/api/workspaces/join/${validInviteCode}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workspace).toHaveProperty('id', targetWorkspaceId.toString());
      expect(res.body.data.workspace.role).toBe('member');
    });

    it('should return HTTP 409 Conflict when user is already a member', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Already Joined',
        owner: new mongoose.Types.ObjectId(),
        inviteCode: validInviteCode,
      });

      const existingMembership = new WorkspaceMember({
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findOne').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(existingMembership);

      const res = await request(app)
        .post(`/api/workspaces/join/${validInviteCode}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already a member/);
    });

    it('should return HTTP 404 Not Found when invite code is invalid or not found', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/workspaces/join/invalid-code')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Invalid or expired invitation code/);
    });
  });

  describe('DELETE /api/workspaces/:id/members/:userId (Remove Member or Leave)', () => {
    const targetWorkspaceId = new mongoose.Types.ObjectId();
    const otherMemberId = new mongoose.Types.ObjectId();

    it('should allow regular member to leave workspace voluntarily', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Leave Workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      const mockTargetMembership = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockTargetMembership);
      jest.spyOn(WorkspaceMember, 'findByIdAndDelete').mockResolvedValue(mockTargetMembership);

      const res = await request(app)
        .delete(`/api/workspaces/${targetWorkspaceId.toString()}/members/${mockUserId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(WorkspaceMember.findByIdAndDelete).toHaveBeenCalledWith(mockTargetMembership._id);
    });

    it('should reject owner attempting to leave without transferring ownership with HTTP 400', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Owner Leave',
        owner: mockUserId,
      });

      const mockOwnerMembership = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockOwnerMembership);

      const res = await request(app)
        .delete(`/api/workspaces/${targetWorkspaceId.toString()}/members/${mockUserId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Workspace owner cannot leave/);
    });

    it('should allow owner to remove another member', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Kick Member',
        owner: mockUserId,
      });

      const mockTargetMembership = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: targetWorkspaceId,
        user: otherMemberId,
        role: 'member',
      });

      const mockOwnerMembership = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'owner',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne')
        .mockResolvedValueOnce(mockTargetMembership) // finding target member
        .mockResolvedValueOnce(mockOwnerMembership); // finding requesting member
      jest.spyOn(WorkspaceMember, 'findByIdAndDelete').mockResolvedValue(mockTargetMembership);

      const res = await request(app)
        .delete(`/api/workspaces/${targetWorkspaceId.toString()}/members/${otherMemberId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject admin attempting to remove workspace owner with HTTP 403', async () => {
      const ownerUserId = new mongoose.Types.ObjectId();
      const mockWorkspaceDoc = new Workspace({
        _id: targetWorkspaceId,
        name: 'Admin Kick Owner',
        owner: ownerUserId,
      });

      const mockTargetMembership = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: targetWorkspaceId,
        user: ownerUserId,
        role: 'owner',
      });

      const mockAdminMembership = new WorkspaceMember({
        _id: new mongoose.Types.ObjectId(),
        workspace: targetWorkspaceId,
        user: mockUserId,
        role: 'admin',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne')
        .mockResolvedValueOnce(mockTargetMembership)
        .mockResolvedValueOnce(mockAdminMembership);

      const res = await request(app)
        .delete(`/api/workspaces/${targetWorkspaceId.toString()}/members/${ownerUserId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Cannot remove the workspace owner/);
    });
  });

  describe('Error & Duplicate Handling', () => {
    it('should return HTTP 409 Conflict when duplicate key error (code 11000) occurs', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      duplicateError.keyValue = { workspace: 'ws1', user: 'u1' };

      jest.spyOn(Workspace, 'create').mockRejectedValue(duplicateError);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Workspace' });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/Duplicate value/);
    });

    it('should return HTTP 500 when database outage occurs during query', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const mockFindQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(new Error('Database connectivity lost')),
      };

      jest.spyOn(WorkspaceMember, 'find').mockReturnValue(mockFindQuery);

      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Database connectivity lost');
    });
  });
});
