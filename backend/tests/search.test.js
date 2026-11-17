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
const { escapeRegex } = require('../src/services/search.service');

describe('Phase 4 Task 2: Full-Text Search', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockUser = new User({
    _id: mockUserId,
    name: 'Linus Torvalds',
    email: 'linus@example.com',
    avatar: 'https://example.com/linus.png',
  });

  const authToken = generateToken(mockUserId.toString());
  const validWorkspaceId = new mongoose.Types.ObjectId();
  const validBoardId = new mongoose.Types.ObjectId();
  const secondBoardId = new mongoose.Types.ObjectId();
  const validListId = new mongoose.Types.ObjectId();
  const validCardId = new mongoose.Types.ObjectId();

  const mockWorkspace = {
    _id: validWorkspaceId,
    name: 'Core Engineering',
    owner: mockUserId,
  };

  const mockMembership = {
    _id: new mongoose.Types.ObjectId(),
    workspace: validWorkspaceId,
    user: mockUserId,
    role: 'owner',
  };

  const mockBoards = [
    {
      _id: validBoardId,
      name: 'Authentication & Security',
      description: 'Zero-trust architecture and OAuth token refresh',
      workspace: validWorkspaceId,
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
    },
    {
      _id: secondBoardId,
      name: 'Platform Infrastructure',
      description: 'Redis caching cluster and pub/sub adapter',
      workspace: validWorkspaceId,
      createdAt: new Date('2026-11-05T10:00:00.000Z'),
    },
  ];

  const mockLists = [
    {
      _id: validListId,
      name: 'Security Review',
      board: validBoardId,
    },
  ];

  const mockCards = [
    {
      _id: validCardId,
      title: 'Fix OAuth Token Refresh Expiry',
      description: 'Implement automatic sliding window for expired bearer JWT tokens',
      priority: 'high',
      dueDate: new Date('2026-11-20T12:00:00.000Z'),
      labels: ['auth', 'security'],
      board: validBoardId,
      list: validListId,
      assignees: [mockUser],
    },
    {
      _id: new mongoose.Types.ObjectId(),
      title: 'Configure Redis Sentinel',
      description: 'High availability Redis deployment for production',
      priority: 'urgent',
      dueDate: null,
      labels: ['redis', 'infra'],
      board: secondBoardId,
      list: validListId,
      assignees: [],
    },
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. Schema & Text Index Verification
  // =========================================================================
  describe('Schema Text Indexes', () => {
    it('should have text indexes defined on Board, Card, and List schemas', () => {
      const boardIndexes = Board.schema.indexes();
      const cardIndexes = Card.schema.indexes();
      const listIndexes = List.schema.indexes();

      const boardTextIdx = boardIndexes.find(
        ([fields]) => fields.name === 'text' && fields.description === 'text'
      );
      expect(boardTextIdx).toBeDefined();
      expect(boardTextIdx[1]).toMatchObject({
        weights: { name: 10, description: 5 },
      });

      const cardTextIdx = cardIndexes.find(
        ([fields]) =>
          fields.title === 'text' &&
          fields.labels === 'text' &&
          fields.description === 'text'
      );
      expect(cardTextIdx).toBeDefined();
      expect(cardTextIdx[1]).toMatchObject({
        weights: { title: 10, labels: 8, description: 4 },
      });

      const listTextIdx = listIndexes.find(([fields]) => fields.name === 'text');
      expect(listTextIdx).toBeDefined();
      expect(listTextIdx[1]).toMatchObject({
        weights: { name: 10 },
      });
    });

    it('escapeRegex should properly escape all regex metacharacters', () => {
      const raw = 'test [abc] (def) *+?^$|{\\}';
      const escaped = escapeRegex(raw);
      expect(() => new RegExp(escaped)).not.toThrow();
      expect(new RegExp(escaped).test(raw)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Authentication & Authorization Tests
  // =========================================================================
  describe('Authentication & Workspace Authorization', () => {
    it('should return 401 Unauthorized when no auth token is provided', async () => {
      const res = await request(app).get(
        `/api/workspaces/${validWorkspaceId.toString()}/search?q=security`
      );

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 Bad Request when workspaceId is malformed', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/workspaces/invalid-id/search?q=security')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
    });

    it('should return 404 Not Found when workspace does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=security`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/workspace not found/i);
    });

    it('should return 403 Forbidden when user is not a member of the workspace', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=security`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/not a member/i);
    });
  });

  // =========================================================================
  // 3. Validation Tests
  // =========================================================================
  describe('Query Validation', () => {
    beforeEach(() => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembership);
    });

    it('should return 400 when query parameter q is missing or empty', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
    });

    it('should return 400 when query parameter q exceeds 100 characters', async () => {
      const longQuery = 'a'.repeat(101);
      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=${longQuery}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 when type is not one of all, cards, boards, lists', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=auth&type=invalid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 when limit is less than 1 or not a number', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=auth&limit=-5`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 when boardId is malformed', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=auth&boardId=not-an-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // =========================================================================
  // 4. Search Execution & Multi-Entity Matching Tests
  // =========================================================================
  describe('Search Execution & Matching', () => {
    beforeEach(() => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspace);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembership);
    });

    const setupMocks = ({ textCards = [], regexCards = [], textBoards = [], regexBoards = [], textLists = [], regexLists = [] } = {}) => {
      // Mock Board resolution (workspace boards)
      jest.spyOn(Board, 'find').mockImplementation((filter) => {
        if (filter && filter.workspace && (filter.$text || filter.$or)) {
          const results = filter.$text ? textBoards : regexBoards;
          return {
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(results),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockBoards),
          }),
        };
      });

      // Mock List resolution
      jest.spyOn(List, 'find').mockImplementation((filter) => {
        if (filter && filter.$text) {
          return {
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(textLists),
            }),
          };
        }
        if (filter && filter.name) {
          return {
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(regexLists),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockLists),
          }),
        };
      });

      // Mock Card resolution
      jest.spyOn(Card, 'find').mockImplementation((filter) => {
        const results = filter && filter.$text ? textCards : regexCards;
        return {
          select: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(results),
            }),
          }),
        };
      });
    };

    it('should search across cards, boards, and lists and return combined results with counts', async () => {
      setupMocks({
        regexBoards: [mockBoards[0]],
        regexLists: [mockLists[0]],
        regexCards: [mockCards[0]],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=security`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        query: 'security',
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
        counts: {
          cards: 1,
          boards: 1,
          lists: 1,
        },
      });

      const results = res.body.data.results;
      expect(results).toHaveLength(3);
      expect(results.some((r) => r.type === 'card')).toBe(true);
      expect(results.some((r) => r.type === 'board')).toBe(true);
      expect(results.some((r) => r.type === 'list')).toBe(true);
    });

    it('should filter strictly by type=cards', async () => {
      setupMocks({
        regexBoards: [mockBoards[0]],
        regexLists: [mockLists[0]],
        regexCards: [mockCards[0]],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=security&type=cards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.counts.cards).toBe(1);
      expect(res.body.data.counts.boards).toBe(0);
      expect(res.body.data.counts.lists).toBe(0);
      expect(res.body.data.results.every((r) => r.type === 'card')).toBe(true);
    });

    it('should filter strictly by type=boards', async () => {
      setupMocks({
        regexBoards: [mockBoards[0]],
        regexLists: [mockLists[0]],
        regexCards: [mockCards[0]],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=security&type=boards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.counts.boards).toBe(1);
      expect(res.body.data.counts.cards).toBe(0);
      expect(res.body.data.counts.lists).toBe(0);
      expect(res.body.data.results.every((r) => r.type === 'board')).toBe(true);
    });

    it('should filter strictly by type=lists', async () => {
      setupMocks({
        regexBoards: [mockBoards[0]],
        regexLists: [mockLists[0]],
        regexCards: [mockCards[0]],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=security&type=lists`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.counts.lists).toBe(1);
      expect(res.body.data.counts.cards).toBe(0);
      expect(res.body.data.counts.boards).toBe(0);
      expect(res.body.data.results.every((r) => r.type === 'list')).toBe(true);
    });

    it('should reject boardId if it does not belong to the workspace', async () => {
      const foreignBoardId = new mongoose.Types.ObjectId();
      setupMocks();

      const res = await request(app)
        .get(
          `/api/workspaces/${validWorkspaceId.toString()}/search?q=security&boardId=${foreignBoardId.toString()}`
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/does not belong to this workspace/i);
    });

    it('should scope search when valid boardId is supplied', async () => {
      setupMocks({
        regexCards: [mockCards[0]],
      });

      const res = await request(app)
        .get(
          `/api/workspaces/${validWorkspaceId.toString()}/search?q=security&boardId=${validBoardId.toString()}`
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.counts.boards).toBe(0); // Boards are excluded when scoping to a single board
      expect(res.body.data.counts.cards).toBe(1);
    });

    it('should prioritize card title matches with highest score', async () => {
      const titleMatch = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Security Architecture',
        description: 'General notes',
        labels: [],
        board: validBoardId,
        list: validListId,
        assignees: [],
      };
      const descMatch = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Database Setup',
        description: 'Ensure security compliance',
        labels: [],
        board: validBoardId,
        list: validListId,
        assignees: [],
      };

      setupMocks({
        regexCards: [descMatch, titleMatch],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=security&type=cards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const results = res.body.data.results;
      expect(results[0].id).toBe(titleMatch._id.toString());
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should deduplicate items matched by both text and regex', async () => {
      const duplicateCard = {
        _id: validCardId,
        title: 'OAuth Refresh Token',
        description: 'OAuth sliding refresh',
        labels: ['auth'],
        board: validBoardId,
        list: validListId,
        assignees: [],
        score: 3.5,
      };

      setupMocks({
        textCards: [duplicateCard],
        regexCards: [duplicateCard],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=OAuth&type=cards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.results).toHaveLength(1);
    });

    it('should handle pagination correctly with page and limit', async () => {
      const item1 = { ...mockBoards[0], _id: new mongoose.Types.ObjectId() };
      const item2 = { ...mockBoards[1], _id: new mongoose.Types.ObjectId() };
      const item3 = { ...mockBoards[0], _id: new mongoose.Types.ObjectId() };

      setupMocks({
        regexBoards: [item1, item2, item3],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=platform&type=boards&limit=2&page=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.results).toHaveLength(2);

      const resPage2 = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=platform&type=boards&limit=2&page=2`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.results).toHaveLength(1);
    });

    it('should return empty results gracefully when no items match', async () => {
      setupMocks({
        regexCards: [],
        regexBoards: [],
        regexLists: [],
      });

      const res = await request(app)
        .get(`/api/workspaces/${validWorkspaceId.toString()}/search?q=nonexistentqueryxyz`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.results).toEqual([]);
      expect(res.body.data.counts).toEqual({ cards: 0, boards: 0, lists: 0 });
    });
  });
});
