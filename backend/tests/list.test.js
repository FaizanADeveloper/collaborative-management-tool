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

describe('Milestone 05C: List Management', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockUser = new User({
    _id: mockUserId,
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    avatar: 'https://example.com/sarah.png',
  });

  const authToken = generateToken(mockUserId.toString());
  const validWorkspaceId = new mongoose.Types.ObjectId();
  const validBoardId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('List Model Schema & Index Tests (In-Memory Mongoose Validation)', () => {
    it('should validate a valid List document successfully with default position', async () => {
      const list = new List({
        name: 'To Do',
        board: validBoardId,
      });

      await expect(list.validate()).resolves.toBeUndefined();
      expect(list.name).toBe('To Do');
      expect(list.board).toEqual(validBoardId);
      expect(list.position).toBe(1000);
    });

    it('should fail List validation when name or board is missing', async () => {
      const list = new List({});
      let validationError;
      try {
        await list.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.board).toBeDefined();
    });

    it('should fail List validation when name is empty or exceeds 100 characters', async () => {
      const emptyNameList = new List({
        name: '',
        board: validBoardId,
      });

      await expect(emptyNameList.validate()).rejects.toThrow(/List name is required/);

      const longNameList = new List({
        name: 'A'.repeat(101),
        board: validBoardId,
      });

      await expect(longNameList.validate()).rejects.toThrow(/cannot exceed 100 characters/);
    });

    it('should declare a compound index on board, position, and createdAt in List schema', () => {
      const indexes = List.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields]) => fields.board === 1 && fields.position === 1 && fields.createdAt === 1
      );

      expect(compoundIndex).toBeDefined();
    });

    it('should transform _id to id and remove __v in toJSON for List', () => {
      const mockListId = new mongoose.Types.ObjectId();
      const list = new List({
        _id: mockListId,
        name: 'Done',
        board: validBoardId,
        position: 3000,
      });

      const json = list.toJSON();
      expect(json.id).toBe(mockListId.toString());
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });

  describe('POST /api/boards/:boardId/lists (Create List)', () => {
    it('should successfully create a list with default auto-spaced position (1000) when no lists exist', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Sprint Board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockListId = new mongoose.Types.ObjectId();
      const mockCreatedList = new List({
        _id: mockListId,
        name: 'Backlog',
        board: validBoardId,
        position: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(null), // No previous lists exist
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(List, 'findOne').mockReturnValue(mockFindOneQuery);
      jest.spyOn(List, 'create').mockResolvedValue(mockCreatedList);

      const res = await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Backlog' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('message', 'List created successfully');
      expect(res.body.data).toHaveProperty('list');

      const { list } = res.body.data;
      expect(list).toHaveProperty('id', mockListId.toString());
      expect(list).toHaveProperty('name', 'Backlog');
      expect(list).toHaveProperty('position', 1000);
      expect(list.board.toString()).toBe(validBoardId.toString());

      expect(List.create).toHaveBeenCalledWith({
        name: 'Backlog',
        board: validBoardId.toString(),
        position: 1000,
      });
    });

    it('should calculate position as highest + 1000 when prior lists exist', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Sprint Board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ position: 2000 }),
      };

      const mockListId = new mongoose.Types.ObjectId();
      const mockCreatedList = new List({
        _id: mockListId,
        name: 'Done',
        board: validBoardId,
        position: 3000,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(List, 'findOne').mockReturnValue(mockFindOneQuery);
      jest.spyOn(List, 'create').mockResolvedValue(mockCreatedList);

      const res = await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Done' });

      expect(res.status).toBe(201);
      expect(List.create).toHaveBeenCalledWith({
        name: 'Done',
        board: validBoardId.toString(),
        position: 3000,
      });
    });

    it('should allow setting an explicit custom position', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Sprint Board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockListId = new mongoose.Types.ObjectId();
      const mockCreatedList = new List({
        _id: mockListId,
        name: 'First Column',
        board: validBoardId,
        position: 500,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(List, 'create').mockResolvedValue(mockCreatedList);

      const res = await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'First Column', position: 500 });

      expect(res.status).toBe(201);
      expect(List.create).toHaveBeenCalledWith({
        name: 'First Column',
        board: validBoardId.toString(),
        position: 500,
      });
    });

    it('should reject unauthenticated list creation with HTTP 401', async () => {
      const res = await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .send({ name: 'Unauthenticated' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Access denied/);
    });

    it('should return HTTP 404 Not Found when target board does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Orphan List' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Board not found');
    });

    it('should return HTTP 403 Forbidden when user is NOT a member of the workspace', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Private Board',
        workspace: validWorkspaceId,
        createdBy: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Forbidden List' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });

    it('should return HTTP 400 Bad Request when boardId is malformed', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/boards/invalid-board-id/lists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Valid Name' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'boardId' })])
      );
    });

    it('should return HTTP 400 Bad Request when position is negative, string, null, or Infinity', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const invalidPayloads = [
        { name: 'Test', position: -1 },
        { name: 'Test', position: '100' },
        { name: 'Test', position: null },
        { name: 'Test', position: Infinity },
      ];

      for (const payload of invalidPayloads) {
        const res = await request(app)
          .post(`/api/boards/${validBoardId.toString()}/lists`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Validation Error');
      }
    });

    it('should prevent mass assignment of board from request body', async () => {
      const forgedBoardId = new mongoose.Types.ObjectId();
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Sprint Board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockCreatedList = new List({
        _id: new mongoose.Types.ObjectId(),
        name: 'Mass Assignment Safe',
        board: validBoardId,
        position: 1000,
      });

      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(List, 'findOne').mockReturnValue(mockFindOneQuery);
      jest.spyOn(List, 'create').mockResolvedValue(mockCreatedList);

      await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Mass Assignment Safe',
          board: forgedBoardId.toString(),
        });

      // Verify List.create ignores forged board and locks to route param
      expect(List.create).toHaveBeenCalledWith({
        name: 'Mass Assignment Safe',
        board: validBoardId.toString(),
        position: 1000,
      });
    });
  });

  describe('GET /api/boards/:boardId/lists (Get Board Lists)', () => {
    it('should return board lists sorted in deterministic order by position and createdAt', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Project Board',
        workspace: validWorkspaceId,
        createdBy: mockUserId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const list1 = new List({
        _id: new mongoose.Types.ObjectId(),
        name: 'To Do',
        board: validBoardId,
        position: 1000,
        createdAt: new Date('2026-01-01'),
      });

      const list2 = new List({
        _id: new mongoose.Types.ObjectId(),
        name: 'In Progress',
        board: validBoardId,
        position: 2000,
        createdAt: new Date('2026-01-02'),
      });

      const mockFindQuery = {
        sort: jest.fn().mockResolvedValue([list1, list2]),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(List, 'find').mockReturnValue(mockFindQuery);

      const res = await request(app)
        .get(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.message).toBe('Lists retrieved successfully');
      expect(res.body.data.lists).toHaveLength(2);
      expect(res.body.data.lists[0]).toHaveProperty('name', 'To Do');
      expect(res.body.data.lists[1]).toHaveProperty('name', 'In Progress');

      // Verify query is strictly scoped and sorted deterministically
      expect(List.find).toHaveBeenCalledWith({ board: validBoardId.toString() });
      expect(mockFindQuery.sort).toHaveBeenCalledWith({ position: 1, createdAt: 1 });
    });

    it('should reject unauthenticated board list retrieval with HTTP 401', async () => {
      const res = await request(app).get(`/api/boards/${validBoardId.toString()}/lists`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return HTTP 404 Not Found when board does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Board not found');
    });

    it('should return HTTP 403 Forbidden when user is NOT a member of the workspace', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Private Board',
        workspace: validWorkspaceId,
        createdBy: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });
  });

  describe('PATCH /api/lists/:id (Update List Name and/or Position)', () => {
    const targetListId = new mongoose.Types.ObjectId();

    it('should successfully update list name', async () => {
      const mockListDoc = new List({
        _id: targetListId,
        name: 'Old Name',
        board: validBoardId,
        position: 1000,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Main Board',
        workspace: validWorkspaceId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockListDoc, 'save').mockResolvedValue(mockListDoc);

      const res = await request(app)
        .patch(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.list).toHaveProperty('name', 'New Name');
      expect(mockListDoc.name).toBe('New Name');
      expect(mockListDoc.save).toHaveBeenCalled();
    });

    it('should successfully update list position', async () => {
      const mockListDoc = new List({
        _id: targetListId,
        name: 'Review',
        board: validBoardId,
        position: 1000,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        workspace: validWorkspaceId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockListDoc, 'save').mockResolvedValue(mockListDoc);

      const res = await request(app)
        .patch(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ position: 2500 });

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveProperty('position', 2500);
      expect(mockListDoc.position).toBe(2500);
      expect(mockListDoc.save).toHaveBeenCalled();
    });

    it('should reject update request when body is empty with HTTP 400', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .patch(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });

    it('should return HTTP 403 Forbidden when user is NOT a member of the workspace', async () => {
      const mockListDoc = new List({
        _id: targetListId,
        name: 'Private List',
        board: validBoardId,
        position: 1000,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        workspace: validWorkspaceId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Renamed' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });

    it('should return HTTP 404 Not Found when list does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Non Existent' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('List not found');
    });
  });

  describe('DELETE /api/lists/:id (Delete List)', () => {
    const targetListId = new mongoose.Types.ObjectId();

    it('should successfully delete a list for an authorized workspace member', async () => {
      const mockListDoc = new List({
        _id: targetListId,
        name: 'Old List',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        workspace: validWorkspaceId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
      jest.spyOn(List, 'findByIdAndDelete').mockResolvedValue(mockListDoc);

      const res = await request(app)
        .delete(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toBe('List deleted successfully');
      expect(List.findByIdAndDelete).toHaveBeenCalledWith(targetListId.toString());
    });

    it('should return HTTP 403 Forbidden when user is NOT a member of the workspace', async () => {
      const mockListDoc = new List({
        _id: targetListId,
        name: 'Private List',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        workspace: validWorkspaceId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });

    it('should return HTTP 404 Not Found when list does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/lists/${targetListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('List not found');
    });
  });

  describe('Database Failure & Error Handling', () => {
    it('should return HTTP 500 when unexpected database error occurs during list creation', async () => {
      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Board',
        workspace: validWorkspaceId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(List, 'findOne').mockReturnValue(mockFindOneQuery);
      jest.spyOn(List, 'create').mockRejectedValue(new Error('Database connectivity lost'));

      const res = await request(app)
        .post(`/api/boards/${validBoardId.toString()}/lists`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Crash List' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Database connectivity lost');
    });
  });
});
