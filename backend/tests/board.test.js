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

describe('Milestone 05B: Board Foundation', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockUser = new User({
    _id: mockUserId,
    name: 'Taylor Swift',
    email: 'taylor@example.com',
    avatar: 'https://example.com/taylor.png',
  });

  const authToken = generateToken(mockUserId.toString());
  const validWorkspaceId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Board Model Schema & Index Tests (In-Memory Mongoose Validation)', () => {
    it('should validate a valid Board document successfully', async () => {
      const board = new Board({
        name: 'Sprint Backlog',
        description: 'Current sprint tracking board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      await expect(board.validate()).resolves.toBeUndefined();
      expect(board.name).toBe('Sprint Backlog');
      expect(board.description).toBe('Current sprint tracking board');
      expect(board.workspace).toEqual(validWorkspaceId);
      expect(board.createdBy).toEqual(mockUserId);
    });

    it('should fail Board validation when name, workspace, or createdBy is missing', async () => {
      const board = new Board({});
      let validationError;
      try {
        await board.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.workspace).toBeDefined();
      expect(validationError.errors.createdBy).toBeDefined();
    });

    it('should fail Board validation when name is shorter than 2 characters or longer than 100 characters', async () => {
      const shortBoard = new Board({
        name: 'A',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      await expect(shortBoard.validate()).rejects.toThrow(/at least 2 characters/);

      const longBoard = new Board({
        name: 'A'.repeat(101),
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      await expect(longBoard.validate()).rejects.toThrow(/cannot exceed 100 characters/);
    });

    it('should fail Board validation when description exceeds 500 characters', async () => {
      const board = new Board({
        name: 'Valid Name',
        description: 'D'.repeat(501),
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      await expect(board.validate()).rejects.toThrow(/cannot exceed 500 characters/);
    });

    it('should declare an index on workspace and createdAt in Board schema', () => {
      const indexes = Board.schema.indexes();
      const workspaceIndex = indexes.find(
        ([fields]) => fields.workspace === 1 && fields.createdAt === -1
      );

      expect(workspaceIndex).toBeDefined();
    });

    it('should transform _id to id and remove __v in toJSON for Board', () => {
      const mockBoardId = new mongoose.Types.ObjectId();
      const board = new Board({
        _id: mockBoardId,
        name: 'Roadmap',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const json = board.toJSON();
      expect(json.id).toBe(mockBoardId.toString());
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });

  describe('POST /api/workspaces/:workspaceId/boards (Create Board)', () => {
    it('should successfully create a board for an authorized workspace member', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: validWorkspaceId,
        name: 'Engineering Hub',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockBoardId = new mongoose.Types.ObjectId();
      const mockCreatedBoard = new Board({
        _id: mockBoardId,
        name: 'Kanban Board',
        description: 'Daily workflow board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Board, 'create').mockResolvedValue(mockCreatedBoard);

      const res = await request(app)
        .post(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Kanban Board',
          description: 'Daily workflow board',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'Board created successfully');
      expect(res.body.data).toHaveProperty('board');

      const { board } = res.body.data;
      expect(board).toHaveProperty('id', mockBoardId.toString());
      expect(board).toHaveProperty('name', 'Kanban Board');
      expect(board.workspace.toString()).toBe(validWorkspaceId.toString());
      expect(board.createdBy.toString()).toBe(mockUserId.toString());

      expect(Board.create).toHaveBeenCalledWith({
        name: 'Kanban Board',
        description: 'Daily workflow board',
        workspace: validWorkspaceId.toString(),
        createdBy: mockUserId,
      });
    });

    it('should reject unauthenticated board creation with HTTP 401', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .send({ name: 'Unauthenticated Board' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/Access denied/);
    });

    it('should return HTTP 404 Not Found when target workspace does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Orphan Board' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Workspace not found');
    });

    it('should return HTTP 403 Forbidden when authenticated user is NOT a member of the workspace', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: validWorkspaceId,
        name: 'Private Workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Unauthorized Board' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not a member/);
    });

    it('should return HTTP 400 Bad Request when workspaceId parameter is malformed', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/workspaces/invalid-workspace-id/boards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Valid Board Name' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'workspaceId' })])
      );
    });

    it('should return HTTP 400 Bad Request when board name is missing or invalid', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .post(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name' })])
      );
    });

    it('should prevent mass assignment of workspace and createdBy from request body', async () => {
      const forgedWorkspaceId = new mongoose.Types.ObjectId();
      const forgedUserId = new mongoose.Types.ObjectId();
      const mockBoardId = new mongoose.Types.ObjectId();

      const mockWorkspaceDoc = new Workspace({
        _id: validWorkspaceId,
        name: 'Security Workspace',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockCreatedBoard = new Board({
        _id: mockBoardId,
        name: 'Protected Board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Board, 'create').mockResolvedValue(mockCreatedBoard);

      await request(app)
        .post(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Protected Board',
          workspace: forgedWorkspaceId.toString(),
          createdBy: forgedUserId.toString(),
        });

      // Verify Board.create uses route workspaceId and authenticated user ID only
      expect(Board.create).toHaveBeenCalledWith({
        name: 'Protected Board',
        description: '',
        workspace: validWorkspaceId.toString(),
        createdBy: mockUserId,
      });
    });
  });

  describe('GET /api/workspaces/:workspaceId/boards (List Workspace Boards)', () => {
    it('should return boards belonging strictly to the requested workspace for an authorized member', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: validWorkspaceId,
        name: 'Development Hub',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const board1 = new Board({
        _id: new mongoose.Types.ObjectId(),
        name: 'Board 1',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
        createdAt: new Date(),
      });

      const board2 = new Board({
        _id: new mongoose.Types.ObjectId(),
        name: 'Board 2',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
        createdAt: new Date(),
      });

      const mockFindQuery = {
        sort: jest.fn().mockResolvedValue([board1, board2]),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Board, 'find').mockReturnValue(mockFindQuery);

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'Boards retrieved successfully');
      expect(res.body.data).toHaveProperty('boards');
      expect(res.body.data.boards).toHaveLength(2);
      expect(res.body.data.boards[0]).toHaveProperty('name', 'Board 1');
      expect(res.body.data.boards[1]).toHaveProperty('name', 'Board 2');

      // Verify workspace isolation: find query is strictly scoped to validWorkspaceId
      expect(Board.find).toHaveBeenCalledWith({
        workspace: validWorkspaceId.toString(),
      });
    });

    it('should reject unauthenticated workspace board listing with HTTP 401', async () => {
      const res = await request(app).get(`/api/workspaces/${validWorkspaceId.toString()}/boards`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return HTTP 404 Not Found when workspace does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Workspace not found');
    });

    it('should return HTTP 403 Forbidden when authenticated user is NOT a member of the workspace', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: validWorkspaceId,
        name: 'Private Workspace',
        owner: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not a member/);
    });

    it('should return HTTP 400 Bad Request when workspaceId is malformed', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/workspaces/invalid-id/boards')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });
  });

  describe('GET /api/boards/:id (Get Board Details by ID)', () => {
    const validBoardId = new mongoose.Types.ObjectId();

    it('should return board details with populated creator details when user is a workspace member', async () => {
      const mockCreator = {
        id: mockUserId.toString(),
        name: 'Taylor Swift',
        email: 'taylor@example.com',
        avatar: 'https://example.com/taylor.png',
      };

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Project Delta',
        description: 'Delta delivery board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(mockBoardDoc, 'populate').mockImplementation(async function () {
        this._doc.createdBy = mockCreator;
        return this;
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);

      const res = await request(app)
        .get(`/api/boards/${validBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data).toHaveProperty('board');

      const { board } = res.body.data;
      expect(board).toHaveProperty('id', validBoardId.toString());
      expect(board).toHaveProperty('name', 'Project Delta');
      expect(board.createdBy).toHaveProperty('name', 'Taylor Swift');
      expect(mockBoardDoc.populate).toHaveBeenCalledWith('createdBy', 'name email avatar');
    });

    it('should return HTTP 403 Forbidden without populating creator details when user is NOT a member of the workspace', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Confidential Board',
        workspace: validWorkspaceId,
        createdBy: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(mockBoardDoc, 'populate').mockResolvedValue(mockBoardDoc);

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      // User is not a member of board.workspace
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/boards/${validBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not a member/);

      // Verify populate was never called
      expect(mockBoardDoc.populate).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 Not Found when board does not exist', async () => {
      const nonExistentBoardId = new mongoose.Types.ObjectId();

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/boards/${nonExistentBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Board not found');
    });

    it('should return HTTP 400 Bad Request when board ID parameter is malformed', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/boards/invalid-board-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })])
      );
    });
  });

  describe('PUT /api/boards/:id (Update Board)', () => {
    const targetBoardId = new mongoose.Types.ObjectId();

    it('should allow board creator to update board details', async () => {
      const mockBoardDoc = new Board({
        _id: targetBoardId,
        name: 'Original Board',
        description: 'Original Desc',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockBoardDoc, 'save').mockResolvedValue(mockBoardDoc);

      const res = await request(app)
        .put(`/api/boards/${targetBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Board', description: 'Updated Desc' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.board.name).toBe('Updated Board');
      expect(res.body.data.board.description).toBe('Updated Desc');
    });

    it('should allow workspace admin to update board details even if not creator', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const mockBoardDoc = new Board({
        _id: targetBoardId,
        name: 'Original Board',
        workspace: validWorkspaceId,
        createdBy: otherUserId,
      });

      const mockAdminMembership = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'admin',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockAdminMembership);
      jest.spyOn(mockBoardDoc, 'save').mockResolvedValue(mockBoardDoc);

      const res = await request(app)
        .put(`/api/boards/${targetBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Admin Renamed Board' });

      expect(res.status).toBe(200);
      expect(res.body.data.board.name).toBe('Admin Renamed Board');
    });

    it('should return HTTP 403 Forbidden when a non-creator regular member attempts to update board', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const mockBoardDoc = new Board({
        _id: targetBoardId,
        name: 'Original Board',
        workspace: validWorkspaceId,
        createdBy: otherUserId,
      });

      const mockMemberMembership = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMemberMembership);

      const res = await request(app)
        .put(`/api/boards/${targetBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Unauthorized Renamed' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only workspace owners, admins, or the board creator/);
    });

    it('should return HTTP 400 Bad Request when update payload is empty', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .put(`/api/boards/${targetBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });
  });

  describe('DELETE /api/boards/:id (Delete Board & Cascading)', () => {
    const targetBoardId = new mongoose.Types.ObjectId();

    it('should allow board creator to delete board and cascade delete child lists', async () => {
      const mockBoardDoc = new Board({
        _id: targetBoardId,
        name: 'Board to Delete',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(List, 'deleteMany').mockResolvedValue({ deletedCount: 3 });
      jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
      jest.spyOn(Board, 'findByIdAndDelete').mockResolvedValue(mockBoardDoc);

      const res = await request(app)
        .delete(`/api/boards/${targetBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(List.deleteMany).toHaveBeenCalledWith({ board: targetBoardId.toString() });
      expect(Board.findByIdAndDelete).toHaveBeenCalledWith(targetBoardId.toString());
    });

    it('should return HTTP 403 Forbidden when a non-creator regular member attempts to delete board', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const mockBoardDoc = new Board({
        _id: targetBoardId,
        name: 'Board to Delete',
        workspace: validWorkspaceId,
        createdBy: otherUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);

      const res = await request(app)
        .delete(`/api/boards/${targetBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only workspace owners, admins, or the board creator/);
    });

    it('should return HTTP 404 Not Found when board does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/boards/${targetBoardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Board not found');
    });
  });

  describe('Database Failure & Error Handling', () => {
    it('should return HTTP 500 when unexpected database error occurs during board creation', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: validWorkspaceId,
        name: 'Faulty Workspace',
        owner: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Board, 'create').mockRejectedValue(new Error('Database write failure'));

      const res = await request(app)
        .post(`/api/workspaces/${validWorkspaceId.toString()}/boards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Crash Board' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Database write failure');
    });
  });
});
