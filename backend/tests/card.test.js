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

describe('Week 2: Card Model and CRUD Foundation', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockUser = new User({
    _id: mockUserId,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    avatar: 'https://example.com/ada.png',
  });

  const authToken = generateToken(mockUserId.toString());
  const validWorkspaceId = new mongoose.Types.ObjectId();
  const validBoardId = new mongoose.Types.ObjectId();
  const validListId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Card Model Schema & Index Tests', () => {
    it('should validate a valid Card document successfully with defaults', async () => {
      const card = new Card({
        title: 'Implement Database Sharding',
        list: validListId,
        board: validBoardId,
      });

      await expect(card.validate()).resolves.toBeUndefined();
      expect(card.title).toBe('Implement Database Sharding');
      expect(card.list).toEqual(validListId);
      expect(card.board).toEqual(validBoardId);
      expect(card.position).toBe(1000);
      expect(card.priority).toBe('medium');
      expect(card.assignees).toEqual([]);
      expect(card.labels).toEqual([]);
      expect(card.dueDate).toBeNull();
    });

    it('should fail Card validation when title, list, or board is missing', async () => {
      const card = new Card({});
      let validationError;
      try {
        await card.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.title).toBeDefined();
      expect(validationError.errors.list).toBeDefined();
      expect(validationError.errors.board).toBeDefined();
    });

    it('should fail Card validation when priority is invalid', async () => {
      const card = new Card({
        title: 'Test',
        list: validListId,
        board: validBoardId,
        priority: 'super-urgent',
      });

      await expect(card.validate()).rejects.toThrow(/Priority must be low, medium, high, or urgent/);
    });

    it('should declare a compound index on list, position, and createdAt in Card schema', () => {
      const indexes = Card.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields]) => fields.list === 1 && fields.position === 1 && fields.createdAt === 1
      );

      expect(compoundIndex).toBeDefined();
    });

    it('should transform _id to id and remove __v in toJSON for Card', () => {
      const mockCardId = new mongoose.Types.ObjectId();
      const card = new Card({
        _id: mockCardId,
        title: 'JSON transform card',
        list: validListId,
        board: validBoardId,
      });

      const json = card.toJSON();
      expect(json.id).toBe(mockCardId.toString());
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });

  describe('POST /api/lists/:listId/cards (Create Card)', () => {
    it('should create a card with default auto-spaced position (1000) when no cards exist', async () => {
      const mockListDoc = new List({
        _id: validListId,
        name: 'In Progress',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Sprint 10',
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

      const mockCreatedCard = new Card({
        _id: new mongoose.Types.ObjectId(),
        title: 'Setup CI/CD Pipeline',
        list: validListId,
        board: validBoardId,
        position: 1000,
        priority: 'high',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'findOne').mockReturnValue(mockFindOneQuery);
      jest.spyOn(Card, 'create').mockResolvedValue(mockCreatedCard);

      const res = await request(app)
        .post(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Setup CI/CD Pipeline',
          priority: 'high',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.card).toHaveProperty('title', 'Setup CI/CD Pipeline');
      expect(res.body.data.card).toHaveProperty('position', 1000);
      expect(res.body.data.card).toHaveProperty('priority', 'high');
      expect(Card.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Setup CI/CD Pipeline',
          list: validListId.toString(),
          board: validBoardId,
          position: 1000,
          priority: 'high',
        })
      );
    });

    it('should calculate position as highest + 1000 when prior cards exist', async () => {
      const mockListDoc = new List({
        _id: validListId,
        name: 'In Progress',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Sprint 10',
        workspace: validWorkspaceId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ position: 3000 }),
      };

      const mockCreatedCard = new Card({
        _id: new mongoose.Types.ObjectId(),
        title: 'Second Task',
        list: validListId,
        board: validBoardId,
        position: 4000,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'findOne').mockReturnValue(mockFindOneQuery);
      jest.spyOn(Card, 'create').mockResolvedValue(mockCreatedCard);

      const res = await request(app)
        .post(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Second Task' });

      expect(res.status).toBe(201);
      expect(Card.create).toHaveBeenCalledWith(
        expect.objectContaining({
          position: 4000,
        })
      );
    });

    it('should return HTTP 403 Forbidden when requesting user is NOT a workspace member', async () => {
      const mockListDoc = new List({
        _id: validListId,
        name: 'Backlog',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Board',
        workspace: validWorkspaceId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Unauthorized Task' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });

    it('should return HTTP 404 Not Found when list does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Non-existent list task' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('List not found');
    });

    it('should prevent mass assignment of board or list from request body', async () => {
      const attackerBoardId = new mongoose.Types.ObjectId();
      const attackerListId = new mongoose.Types.ObjectId();

      const mockListDoc = new List({
        _id: validListId,
        name: 'Trusted List',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Trusted Board',
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

      const mockCreatedCard = new Card({
        _id: new mongoose.Types.ObjectId(),
        title: 'Exploit Task',
        list: validListId,
        board: validBoardId,
        position: 1000,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'findOne').mockReturnValue(mockFindOneQuery);
      jest.spyOn(Card, 'create').mockResolvedValue(mockCreatedCard);

      const res = await request(app)
        .post(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Exploit Task',
          board: attackerBoardId.toString(),
          list: attackerListId.toString(),
        });

      expect(res.status).toBe(201);
      expect(Card.create).toHaveBeenCalledWith(
        expect.objectContaining({
          board: validBoardId,
          list: validListId.toString(),
        })
      );
    });
  });

  describe('GET /api/lists/:listId/cards (Get List Cards)', () => {
    it('should return list cards sorted by position and creation date', async () => {
      const mockListDoc = new List({
        _id: validListId,
        name: 'To Do',
        board: validBoardId,
      });

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

      const mockCards = [
        new Card({ _id: new mongoose.Types.ObjectId(), title: 'Card 1', position: 1000, list: validListId, board: validBoardId }),
        new Card({ _id: new mongoose.Types.ObjectId(), title: 'Card 2', position: 2000, list: validListId, board: validBoardId }),
      ];

      const mockFindQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockCards),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'find').mockReturnValue(mockFindQuery);

      const res = await request(app)
        .get(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cards).toHaveLength(2);
      expect(mockFindQuery.sort).toHaveBeenCalledWith({ position: 1, createdAt: 1 });
    });

    it('should return HTTP 403 Forbidden when requesting user is NOT a workspace member', async () => {
      const mockListDoc = new List({
        _id: validListId,
        name: 'To Do',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Board',
        workspace: validWorkspaceId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });
  });

  describe('GET /api/cards/:id (Get Card by ID)', () => {
    const targetCardId = new mongoose.Types.ObjectId();

    it('should return card details with populated assignees for authorized workspace member', async () => {
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Inspect Performance',
        list: validListId,
        board: validBoardId,
        assignees: [mockUserId],
      });

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

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockCardDoc, 'populate').mockResolvedValue(mockCardDoc);

      const res = await request(app)
        .get(`/api/cards/${targetCardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.card).toHaveProperty('id', targetCardId.toString());
      expect(mockCardDoc.populate).toHaveBeenCalledWith('assignees', 'name email avatar');
    });

    it('should return HTTP 404 Not Found when card does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/cards/${targetCardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Card not found');
    });
  });

  describe('PATCH /api/cards/:id & PUT /api/cards/:id (Update Card)', () => {
    const targetCardId = new mongoose.Types.ObjectId();

    it('should update card fields successfully', async () => {
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Original Title',
        list: validListId,
        board: validBoardId,
        priority: 'low',
      });

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

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockCardDoc, 'save').mockResolvedValue(mockCardDoc);
      jest.spyOn(mockCardDoc, 'populate').mockResolvedValue(mockCardDoc);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Refactored Title',
          priority: 'urgent',
          labels: ['backend', 'database'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.card.title).toBe('Refactored Title');
      expect(res.body.data.card.priority).toBe('urgent');
    });

    it('should reject update with HTTP 400 when request body is empty', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });
  });

  describe('DELETE /api/cards/:id (Delete Card)', () => {
    const targetCardId = new mongoose.Types.ObjectId();

    it('should delete card for authorized workspace member', async () => {
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Delete Me',
        list: validListId,
        board: validBoardId,
      });

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

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'findByIdAndDelete').mockResolvedValue(mockCardDoc);

      const res = await request(app)
        .delete(`/api/cards/${targetCardId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Card.findByIdAndDelete).toHaveBeenCalledWith(targetCardId.toString());
    });
  });

  describe('PATCH /api/cards/:id/move (Card Movement & Reordering)', () => {
    const targetCardId = new mongoose.Types.ObjectId();
    const sourceListId = validListId;
    const destinationListId = new mongoose.Types.ObjectId();

    it('should successfully move a card to another list on the same board and update position', async () => {
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Task to Move',
        list: sourceListId,
        board: validBoardId,
        position: 1000,
      });

      const mockDestListDoc = new List({
        _id: destinationListId,
        name: 'Done List',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Sprint Board',
        workspace: validWorkspaceId,
      });

      const mockMembershipDoc = new WorkspaceMember({
        workspace: validWorkspaceId,
        user: mockUserId,
        role: 'member',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(List, 'findById').mockResolvedValue(mockDestListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockCardDoc, 'save').mockResolvedValue(mockCardDoc);
      jest.spyOn(mockCardDoc, 'populate').mockResolvedValue(mockCardDoc);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destinationListId: destinationListId.toString(),
          position: 2500,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCardDoc.list.toString()).toBe(destinationListId.toString());
      expect(mockCardDoc.position).toBe(2500);
    });

    it('should successfully move a card within the same list (reordering)', async () => {
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Reorder Task',
        list: sourceListId,
        board: validBoardId,
        position: 3000,
      });

      const mockSourceListDoc = new List({
        _id: sourceListId,
        name: 'To Do',
        board: validBoardId,
      });

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

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(List, 'findById').mockResolvedValue(mockSourceListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(mockCardDoc, 'save').mockResolvedValue(mockCardDoc);
      jest.spyOn(mockCardDoc, 'populate').mockResolvedValue(mockCardDoc);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destinationListId: sourceListId.toString(),
          position: 500, // Move to front
        });

      expect(res.status).toBe(200);
      expect(mockCardDoc.list.toString()).toBe(sourceListId.toString());
      expect(mockCardDoc.position).toBe(500);
    });

    it('should reject move with HTTP 400 when destination list belongs to a different board', async () => {
      const foreignBoardId = new mongoose.Types.ObjectId();
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Task',
        list: sourceListId,
        board: validBoardId,
      });

      const mockForeignListDoc = new List({
        _id: destinationListId,
        name: 'Foreign List',
        board: foreignBoardId, // Different board!
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(List, 'findById').mockResolvedValue(mockForeignListDoc);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destinationListId: destinationListId.toString(),
          position: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Destination list must belong to the same board/);
    });

    it('should return HTTP 403 Forbidden when requesting user is NOT a workspace member', async () => {
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Task',
        list: sourceListId,
        board: validBoardId,
      });

      const mockDestListDoc = new List({
        _id: destinationListId,
        name: 'Done List',
        board: validBoardId,
      });

      const mockBoardDoc = new Board({
        _id: validBoardId,
        name: 'Board',
        workspace: validWorkspaceId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(List, 'findById').mockResolvedValue(mockDestListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destinationListId: destinationListId.toString(),
          position: 1000,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/);
    });

    it('should return HTTP 404 Not Found when destination list does not exist', async () => {
      const mockCardDoc = new Card({
        _id: targetCardId,
        title: 'Task',
        list: sourceListId,
        board: validBoardId,
      });

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(List, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destinationListId: destinationListId.toString(),
          position: 1000,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Destination list not found');
    });

    it('should return HTTP 400 Bad Request when position is negative, string, or null', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .patch(`/api/cards/${targetCardId.toString()}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destinationListId: destinationListId.toString(),
          position: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });
  });

  describe('List Deletion Cascading', () => {
    it('should delete child cards when a list is deleted', async () => {
      const mockListDoc = new List({
        _id: validListId,
        name: 'List with Cards',
        board: validBoardId,
      });

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

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 8 });
      jest.spyOn(List, 'findByIdAndDelete').mockResolvedValue(mockListDoc);

      const res = await request(app)
        .delete(`/api/lists/${validListId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Card.deleteMany).toHaveBeenCalledWith({ list: validListId.toString() });
      expect(List.findByIdAndDelete).toHaveBeenCalledWith(validListId.toString());
    });
  });

  describe('Database Failure Handling', () => {
    it('should return HTTP 500 when unexpected error occurs during card creation', async () => {
      const mockListDoc = new List({
        _id: validListId,
        name: 'List',
        board: validBoardId,
      });

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

      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(List, 'findById').mockResolvedValue(mockListDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembershipDoc);
      jest.spyOn(Card, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockRejectedValue(new Error('Database timeout')),
      });

      const res = await request(app)
        .post(`/api/lists/${validListId.toString()}/cards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Crash' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Database timeout');
    });
  });
});
