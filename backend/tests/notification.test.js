const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Workspace = require('../src/models/Workspace');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const Notification = require('../src/models/Notification');
const { generateToken } = require('../src/utils/token');
const {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../src/services/notification.service');
const socketEvents = require('../src/socket/events');

describe('Phase 4 Task 3: In-App Notifications Backend', () => {
  const mockUserId1 = new mongoose.Types.ObjectId();
  const mockUser1 = new User({
    _id: mockUserId1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    avatar: 'https://example.com/ada.png',
  });

  const mockUserId2 = new mongoose.Types.ObjectId();
  const mockUser2 = new User({
    _id: mockUserId2,
    name: 'Alan Turing',
    email: 'alan@example.com',
    avatar: 'https://example.com/alan.png',
  });

  const authToken1 = generateToken(mockUserId1.toString());
  const authToken2 = generateToken(mockUserId2.toString());
  const validWorkspaceId = new mongoose.Types.ObjectId();

  const mockWorkspace = {
    _id: validWorkspaceId,
    name: 'Algorithms Lab',
    owner: mockUserId1,
  };

  const mockMembership1 = {
    _id: new mongoose.Types.ObjectId(),
    workspace: validWorkspaceId,
    user: mockUserId1,
    role: 'owner',
  };

  const mockMembership2 = {
    _id: new mongoose.Types.ObjectId(),
    workspace: validWorkspaceId,
    user: mockUserId2,
    role: 'member',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. Model Schema & Validation Tests
  // =========================================================================
  describe('Notification Model Schema & Indexes', () => {
    it('validates a valid notification document', async () => {
      const doc = new Notification({
        recipient: mockUserId1,
        actor: mockUserId2,
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'Assigned to card',
        message: 'You were assigned to Implement Logic Engine',
        resourceType: 'card',
        resourceId: new mongoose.Types.ObjectId(),
      });

      await expect(doc.validate()).resolves.toBeUndefined();
      expect(doc.isRead).toBe(false);
      expect(doc.readAt).toBeNull();
    });

    it('fails validation when required fields are missing', async () => {
      const doc = new Notification({});
      let err;
      try {
        await doc.validate();
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.errors.recipient).toBeDefined();
      expect(err.errors.workspace).toBeDefined();
      expect(err.errors.type).toBeDefined();
      expect(err.errors.title).toBeDefined();
      expect(err.errors.message).toBeDefined();
    });

    it('rejects invalid notification types', async () => {
      const doc = new Notification({
        recipient: mockUserId1,
        workspace: validWorkspaceId,
        type: 'invalid_type_xyz',
        title: 'Test',
        message: 'Test message',
      });

      await expect(doc.validate()).rejects.toThrow();
    });

    it('defines compound indexes for query efficiency', () => {
      const indexes = Notification.schema.indexes();
      const hasRecipientCreated = indexes.some(
        ([fields]) => fields.recipient === 1 && fields.createdAt === -1
      );
      const hasRecipientUnread = indexes.some(
        ([fields]) => fields.recipient === 1 && fields.isRead === 1 && fields.createdAt === -1
      );
      expect(hasRecipientCreated).toBe(true);
      expect(hasRecipientUnread).toBe(true);
    });
  });

  // =========================================================================
  // 2. Service Layer: Rules, Actor Exclusion & Deduplication
  // =========================================================================
  describe('Notification Service Logic', () => {
    it('excludes actor from receiving notifications about their own actions', async () => {
      const emitSpy = jest.spyOn(socketEvents, 'emitNewNotification').mockReturnValue(true);

      const result = await createNotification({
        recipient: mockUserId1,
        actor: mockUserId1, // Actor is same as recipient
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'Self Assigned',
        message: 'You assigned yourself',
      });

      expect(result).toBeNull();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('prevents notifications to users who are not active workspace members', async () => {
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(null);
      const emitSpy = jest.spyOn(socketEvents, 'emitNewNotification').mockReturnValue(true);

      const result = await createNotification({
        recipient: mockUserId2,
        actor: mockUserId1,
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'New Task',
        message: 'Assigned',
      });

      expect(result).toBeNull();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('deduplicates duplicate event notifications within 10 seconds', async () => {
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembership2);
      const existingDoc = new Notification({
        _id: new mongoose.Types.ObjectId(),
        recipient: mockUserId2,
        actor: mockUserId1,
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'Duplicate Task',
        message: 'Assigned to task',
        resourceId: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
      });

      jest.spyOn(Notification, 'findOne').mockResolvedValue(existingDoc);
      const createSpy = jest.spyOn(Notification, 'create');
      const emitSpy = jest.spyOn(socketEvents, 'emitNewNotification').mockReturnValue(true);

      const result = await createNotification({
        recipient: mockUserId2,
        actor: mockUserId1,
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'Duplicate Task',
        message: 'Assigned to task',
        resourceId: existingDoc.resourceId,
      });

      expect(result).toBeDefined();
      expect(createSpy).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('creates and delivers real-time notification when all criteria are met', async () => {
      jest.spyOn(WorkspaceMember, 'findOne').mockResolvedValue(mockMembership2);
      jest.spyOn(Notification, 'findOne').mockResolvedValue(null);

      const mockCreated = {
        _id: new mongoose.Types.ObjectId(),
        recipient: mockUserId2,
        actor: mockUserId1,
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'New Card Assigned',
        message: 'You were assigned to a card',
        isRead: false,
        populate: jest.fn().mockReturnThis(),
        toJSON: jest.fn().mockReturnValue({
          id: 'notif-123',
          title: 'New Card Assigned',
          recipient: mockUserId2.toString(),
        }),
      };

      jest.spyOn(Notification, 'create').mockResolvedValue(mockCreated);
      const emitSpy = jest.spyOn(socketEvents, 'emitNewNotification').mockReturnValue(true);

      const result = await createNotification({
        recipient: mockUserId2,
        actor: mockUserId1,
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'New Card Assigned',
        message: 'You were assigned to a card',
      });

      expect(result).toBeDefined();
      expect(emitSpy).toHaveBeenCalledWith(
        mockUserId2,
        expect.objectContaining({ id: 'notif-123' })
      );
    });

    it('handles notification creation errors gracefully without throwing', async () => {
      jest.spyOn(WorkspaceMember, 'findOne').mockRejectedValue(new Error('DB failure'));

      const result = await createNotification({
        recipient: mockUserId2,
        actor: mockUserId1,
        workspace: validWorkspaceId,
        type: 'task_assignment',
        title: 'Failing',
        message: 'Should not crash',
      });

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // 3. API Endpoints & Authorization
  // =========================================================================
  describe('Notification API Endpoints', () => {
    beforeEach(() => {
      jest.spyOn(User, 'findById').mockImplementation((id) => {
        if (id.toString() === mockUserId1.toString()) return Promise.resolve(mockUser1);
        if (id.toString() === mockUserId2.toString()) return Promise.resolve(mockUser2);
        return Promise.resolve(null);
      });
    });

    it('should return 401 Unauthorized when request lacks auth token', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should retrieve only the authenticated user notifications (recipient isolation)', async () => {
      const user1Notification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: mockUserId1,
        title: 'User 1 Notification',
        message: 'Hello User 1',
        isRead: false,
        toJSON: () => ({ id: 'n-1', title: 'User 1 Notification' }),
      };

      const findSpy = jest.spyOn(Notification, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue([user1Notification]),
              }),
            }),
          }),
        }),
      });

      jest.spyOn(Notification, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.notifications[0].title).toBe('User 1 Notification');

      // Verify the query strictly targeted User 1's recipient ID
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: mockUserId1 })
      );
    });

    it('should return unread notification count via GET /api/notifications/unread-count', async () => {
      jest.spyOn(Notification, 'countDocuments').mockResolvedValue(5);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ count: 5 });
    });

    it('should mark a single notification as read via PATCH /api/notifications/:id/read', async () => {
      const notifId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: notifId,
        recipient: mockUserId1,
        isRead: false,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(this),
        toJSON: () => ({ id: notifId.toString(), isRead: true }),
      };

      jest.spyOn(Notification, 'findOne').mockResolvedValue(mockDoc);

      const res = await request(app)
        .patch(`/api/notifications/${notifId.toString()}/read`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.isRead).toBe(true);
      expect(mockDoc.isRead).toBe(true);
    });

    it('should return 404 when marking a non-existent or other user notification as read', async () => {
      const notifId = new mongoose.Types.ObjectId();
      // Returns null because notification belongs to another user
      jest.spyOn(Notification, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/notifications/${notifId.toString()}/read`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should mark all notifications as read via PATCH /api/notifications/read-all', async () => {
      jest.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 3 });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ modifiedCount: 3 });
    });

    it('should delete a notification via DELETE /api/notifications/:id', async () => {
      const notifId = new mongoose.Types.ObjectId();
      jest.spyOn(Notification, 'findOneAndDelete').mockResolvedValue({ _id: notifId });

      const res = await request(app)
        .delete(`/api/notifications/${notifId.toString()}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject malformed notificationId parameter with 400 Bad Request', async () => {
      const res = await request(app)
        .patch('/api/notifications/malformed-notif-id/read')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toBe('Validation Error');
    });
  });

  // =========================================================================
  // 4. Real-Time Delivery & Collaboration Event Integration
  // =========================================================================
  describe('Collaboration Event Integration & Socket Delivery', () => {
    it('emitNewNotification correctly emits notification:new to private user room user:<userId>', () => {
      const mockIo = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn().mockReturnValue(true),
      };

      const notifPayload = {
        id: 'notif-999',
        title: 'Realtime Alert',
        message: 'Something happened',
      };

      const emitted = socketEvents.emitNewNotification(mockUserId2.toString(), notifPayload, mockIo);
      expect(emitted).toBe(true);
      expect(mockIo.to).toHaveBeenCalledWith(`user:${mockUserId2.toString()}`);
      expect(mockIo.emit).toHaveBeenCalledWith('notification:new', notifPayload);
    });

    it('returns false when recipientId is invalid or socket server is unavailable', () => {
      const result = socketEvents.emitNewNotification('not-an-id', {}, null);
      expect(result).toBe(false);
    });
  });
});
