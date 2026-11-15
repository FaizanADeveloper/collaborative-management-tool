const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Workspace = require('../src/models/Workspace');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const Board = require('../src/models/Board');
const List = require('../src/models/List');
const Card = require('../src/models/Card');
const Comment = require('../src/models/Comment');
const { generateToken } = require('../src/utils/token');
const cardService = require('../src/services/card.service');
const boardService = require('../src/services/board.service');
const workspaceService = require('../src/services/workspace.service');

describe('Phase 3D: Card Comments Model and REST API', () => {
  const authorUserId = new mongoose.Types.ObjectId();
  const authorUser = new User({
    _id: authorUserId,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    avatar: 'https://example.com/ada.png',
  });

  const memberUserId = new mongoose.Types.ObjectId();
  const memberUser = new User({
    _id: memberUserId,
    name: 'Charles Babbage',
    email: 'charles@example.com',
    avatar: 'https://example.com/charles.png',
  });

  const adminUserId = new mongoose.Types.ObjectId();
  const adminUser = new User({
    _id: adminUserId,
    name: 'Alan Turing',
    email: 'alan@example.com',
    avatar: 'https://example.com/alan.png',
  });

  const outsiderUserId = new mongoose.Types.ObjectId();
  const outsiderUser = new User({
    _id: outsiderUserId,
    name: 'Outside Intruder',
    email: 'intruder@example.com',
    avatar: '',
  });

  const authorToken = generateToken(authorUserId.toString());
  const memberToken = generateToken(memberUserId.toString());
  const adminToken = generateToken(adminUserId.toString());
  const outsiderToken = generateToken(outsiderUserId.toString());

  const validWorkspaceId = new mongoose.Types.ObjectId();
  const validBoardId = new mongoose.Types.ObjectId();
  const validListId = new mongoose.Types.ObjectId();
  const validCardId = new mongoose.Types.ObjectId();
  const validCommentId = new mongoose.Types.ObjectId();

  const mockBoardDoc = new Board({
    _id: validBoardId,
    name: 'Sprint Planning',
    workspace: validWorkspaceId,
    createdBy: authorUserId,
  });

  const mockCardDoc = new Card({
    _id: validCardId,
    title: 'Implement Comments API',
    description: 'Task discussions and collaboration',
    list: validListId,
    board: validBoardId,
    position: 1000,
  });

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockImplementation(async (id) => {
      const strId = String(id);
      if (strId === authorUserId.toString()) return authorUser;
      if (strId === memberUserId.toString()) return memberUser;
      if (strId === adminUserId.toString()) return adminUser;
      if (strId === outsiderUserId.toString()) return outsiderUser;
      return null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // 1. Model Schema & Validation Tests
  // ==========================================
  describe('Comment Model Schema & Validation', () => {
    it('should validate a valid Comment document successfully', async () => {
      const comment = new Comment({
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: authorUserId,
        content: 'This is a clear, concise technical comment.',
      });

      await expect(comment.validate()).resolves.toBeUndefined();
      expect(comment.card).toEqual(validCardId);
      expect(comment.board).toEqual(validBoardId);
      expect(comment.workspace).toEqual(validWorkspaceId);
      expect(comment.author).toEqual(authorUserId);
      expect(comment.content).toBe('This is a clear, concise technical comment.');
    });

    it('should fail validation when content, card, board, workspace, or author is missing', async () => {
      const emptyComment = new Comment({});
      let validationError;
      try {
        await emptyComment.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.content).toBeDefined();
      expect(validationError.errors.card).toBeDefined();
      expect(validationError.errors.board).toBeDefined();
      expect(validationError.errors.workspace).toBeDefined();
      expect(validationError.errors.author).toBeDefined();
    });

    it('should fail validation when content exceeds 2000 characters', async () => {
      const oversizedComment = new Comment({
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: authorUserId,
        content: 'x'.repeat(2001),
      });

      await expect(oversizedComment.validate()).rejects.toThrow();
    });

    it('should enforce compound index on card and createdAt', () => {
      const indexes = Comment.schema.indexes();
      const hasCompoundIndex = indexes.some(
        ([indexDef]) => indexDef.card === 1 && indexDef.createdAt === 1
      );
      expect(hasCompoundIndex).toBe(true);
    });
  });

  // ==========================================
  // 2. POST /api/cards/:cardId/comments
  // ==========================================
  describe('POST /api/cards/:cardId/comments', () => {
    it('should create a comment successfully when user is a workspace member', async () => {
      const mockCommentDoc = new Comment({
        _id: validCommentId,
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: authorUser,
        content: 'Review looks great!',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(authorUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: authorUserId,
          role: 'member',
        })
      );
      jest.spyOn(Comment, 'create').mockResolvedValue(mockCommentDoc);
      jest.spyOn(mockCommentDoc, 'populate').mockResolvedValue(mockCommentDoc);

      const res = await request(app)
        .post(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'Review looks great!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data.comment.content).toBe('Review looks great!');
      expect(res.body.data.comment.card).toBe(validCardId.toString());
      expect(Comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          card: validCardId,
          board: validBoardId,
          workspace: validWorkspaceId,
          author: authorUserId,
          content: 'Review looks great!',
        })
      );
      expect(mockCommentDoc.populate).toHaveBeenCalledWith('author', 'name avatar');
    });

    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await request(app)
        .post(`/api/cards/${validCardId.toString()}/comments`)
        .send({ content: 'Unauthenticated comment' });

      expect(res.status).toBe(401);
    });

    it('should return HTTP 403 Forbidden when requesting user is NOT a workspace member', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ content: 'Intruder comment' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not a member/i);
    });

    it('should return HTTP 404 Not Found when card does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(authorUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'Orphan comment' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Card not found');
    });

    it('should return HTTP 400 Bad Request on invalid card ID parameter format', async () => {
      const res = await request(app)
        .post('/api/cards/invalid-mongo-id/comments')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'Valid content' });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/Invalid ID format/i);
    });

    it('should return HTTP 400 Bad Request on empty or whitespace content', async () => {
      const res = await request(app)
        .post(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: '    ' });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/at least 1 character/i);
    });

    it('should return HTTP 400 Bad Request when content exceeds 2000 characters', async () => {
      const res = await request(app)
        .post(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'a'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toMatch(/cannot exceed 2000 characters/i);
    });

    it('should prevent mass assignment of author, card, board, or workspace', async () => {
      const res = await request(app)
        .post(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          content: 'Valid content',
          author: outsiderUserId.toString(),
          workspace: new mongoose.Types.ObjectId().toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errors[0].message).toMatch(/Unrecognized key|mass assignment|Unexpected fields/i);
    });
  });

  // ==========================================
  // 3. GET /api/cards/:cardId/comments
  // ==========================================
  describe('GET /api/cards/:cardId/comments', () => {
    it('should retrieve comments in chronological order with populated author fields', async () => {
      const comment1 = new Comment({
        _id: new mongoose.Types.ObjectId(),
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: authorUser,
        content: 'First comment in thread',
        createdAt: new Date('2026-11-15T10:00:00Z'),
      });

      const comment2 = new Comment({
        _id: new mongoose.Types.ObjectId(),
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: memberUser,
        content: 'Second comment in thread',
        createdAt: new Date('2026-11-15T10:05:00Z'),
      });

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([comment1, comment2]),
      };

      jest.spyOn(User, 'findById').mockResolvedValue(memberUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: memberUserId,
          role: 'member',
        })
      );
      jest.spyOn(Comment, 'find').mockReturnValue(mockQuery);

      const res = await request(app)
        .get(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.comments).toHaveLength(2);
      expect(res.body.data.comments[0].content).toBe('First comment in thread');
      expect(res.body.data.comments[1].content).toBe('Second comment in thread');
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(mockQuery.populate).toHaveBeenCalledWith('author', 'name avatar');
    });

    it('should return HTTP 403 Forbidden when requesting user is NOT a workspace member', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('should return HTTP 404 Not Found when card does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(authorUser);
      jest.spyOn(Card, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/cards/${validCardId.toString()}/comments`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Card not found');
    });
  });

  // ==========================================
  // 4. DELETE /api/cards/:cardId/comments/:commentId
  // ==========================================
  describe('DELETE /api/cards/:cardId/comments/:commentId', () => {
    it('should allow the comment author to delete their own comment', async () => {
      const mockCommentDoc = new Comment({
        _id: validCommentId,
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: authorUserId,
        content: 'Comment to be deleted by author',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(authorUser);
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockCommentDoc);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: authorUserId,
          role: 'member',
        })
      );
      jest.spyOn(Comment, 'findByIdAndDelete').mockResolvedValue(mockCommentDoc);

      const res = await request(app)
        .delete(`/api/cards/${validCardId.toString()}/comments/${validCommentId.toString()}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Comment deleted successfully');
      expect(Comment.findByIdAndDelete).toHaveBeenCalledWith(validCommentId.toString());
    });

    it('should allow a workspace admin or owner to delete another member comment (moderation)', async () => {
      const mockCommentDoc = new Comment({
        _id: validCommentId,
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: memberUserId, // Authored by Charles
        content: 'Questionable comment',
      });

      // Requested by Alan Turing (admin)
      jest.spyOn(User, 'findById').mockResolvedValue(adminUser);
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockCommentDoc);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: adminUserId,
          role: 'admin',
        })
      );
      jest.spyOn(Comment, 'findByIdAndDelete').mockResolvedValue(mockCommentDoc);

      const res = await request(app)
        .delete(`/api/cards/${validCardId.toString()}/comments/${validCommentId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Comment.findByIdAndDelete).toHaveBeenCalledWith(validCommentId.toString());
    });

    it('should reject non-author regular member with HTTP 403 Forbidden', async () => {
      const mockCommentDoc = new Comment({
        _id: validCommentId,
        card: validCardId,
        board: validBoardId,
        workspace: validWorkspaceId,
        author: authorUserId, // Authored by Ada
        content: 'Ada private note',
      });

      // Charles Babbage is a standard 'member'
      jest.spyOn(User, 'findById').mockResolvedValue(memberUser);
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockCommentDoc);
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: memberUserId,
          role: 'member',
        })
      );
      jest.spyOn(Comment, 'findByIdAndDelete').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/cards/${validCardId.toString()}/comments/${validCommentId.toString()}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only delete your own comments/i);
      expect(Comment.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when comment does not belong to the targeted card', async () => {
      const otherCardId = new mongoose.Types.ObjectId();
      const mockCommentDoc = new Comment({
        _id: validCommentId,
        card: otherCardId, // Belongs to different card
        board: validBoardId,
        workspace: validWorkspaceId,
        author: authorUserId,
        content: 'Cross card comment',
      });

      jest.spyOn(User, 'findById').mockResolvedValue(authorUser);
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockCommentDoc);

      const res = await request(app)
        .delete(`/api/cards/${validCardId.toString()}/comments/${validCommentId.toString()}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Comment does not belong to this card');
    });

    it('should return HTTP 404 when comment does not exist', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(authorUser);
      jest.spyOn(Comment, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/cards/${validCardId.toString()}/comments/${validCommentId.toString()}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Comment not found');
    });
  });

  // ==========================================
  // 5. Cascade Deletion Lifecycle Tests
  // ==========================================
  describe('Cascade Deletion Lifecycle', () => {
    it('should cascade delete comments when parent card is deleted', async () => {
      jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: authorUserId,
          role: 'member',
        })
      );
      jest.spyOn(Card, 'findByIdAndDelete').mockResolvedValue(mockCardDoc);
      jest.spyOn(Comment, 'deleteMany').mockResolvedValue({ deletedCount: 5 });

      await cardService.deleteCard(validCardId.toString(), authorUserId.toString());

      expect(Card.findByIdAndDelete).toHaveBeenCalledWith(validCardId.toString());
      expect(Comment.deleteMany).toHaveBeenCalledWith({ card: validCardId.toString() });
    });

    it('should cascade delete comments when parent board is deleted', async () => {
      jest.spyOn(Board, 'findById').mockResolvedValue(mockBoardDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: authorUserId,
          role: 'owner',
        })
      );
      jest.spyOn(List, 'deleteMany').mockResolvedValue({ deletedCount: 3 });
      jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 8 });
      jest.spyOn(Comment, 'deleteMany').mockResolvedValue({ deletedCount: 12 });
      jest.spyOn(Board, 'findByIdAndDelete').mockResolvedValue(mockBoardDoc);

      await boardService.deleteBoard(validBoardId.toString(), authorUserId.toString());

      expect(Comment.deleteMany).toHaveBeenCalledWith({ board: validBoardId.toString() });
      expect(Board.findByIdAndDelete).toHaveBeenCalledWith(validBoardId.toString());
    });

    it('should cascade delete comments when parent workspace is deleted', async () => {
      const mockWorkspaceDoc = new Workspace({
        _id: validWorkspaceId,
        name: 'Workspace to Delete',
        owner: authorUserId,
      });

      jest.spyOn(Workspace, 'findById').mockResolvedValue(mockWorkspaceDoc);
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(
        new WorkspaceMember({
          workspace: validWorkspaceId,
          user: authorUserId,
          role: 'owner',
        })
      );
      jest.spyOn(Board, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: validBoardId }]),
      });
      jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 10 });
      jest.spyOn(List, 'deleteMany').mockResolvedValue({ deletedCount: 4 });
      jest.spyOn(Board, 'deleteMany').mockResolvedValue({ deletedCount: 1 });
      jest.spyOn(WorkspaceMember, 'deleteMany').mockResolvedValue({ deletedCount: 2 });
      jest.spyOn(Comment, 'deleteMany').mockResolvedValue({ deletedCount: 15 });
      jest.spyOn(Workspace, 'findByIdAndDelete').mockResolvedValue(mockWorkspaceDoc);

      await workspaceService.deleteWorkspace(validWorkspaceId.toString(), authorUserId.toString());

      expect(Comment.deleteMany).toHaveBeenCalledWith({ workspace: validWorkspaceId.toString() });
      expect(Workspace.findByIdAndDelete).toHaveBeenCalledWith(validWorkspaceId.toString());
    });
  });
});
