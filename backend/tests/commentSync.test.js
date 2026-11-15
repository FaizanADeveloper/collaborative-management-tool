const http = require('http');
const mongoose = require('mongoose');
const { io: createClient } = require('socket.io-client');
const app = require('../src/app');
const User = require('../src/models/User');
const Board = require('../src/models/Board');
const Card = require('../src/models/Card');
const Comment = require('../src/models/Comment');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const { generateToken } = require('../src/utils/token');
const { initSocketServer, closeSocketServer } = require('../src/socket');
const commentService = require('../src/services/comment.service');

const connectClient = (url, token) =>
  createClient(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    auth: { token },
  });

const waitForConnect = (client) =>
  new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('connect_error', reject);
  });

const emitWithAck = (socket, event, payload) =>
  new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });

const waitForEvent = (socket, event, timeoutMs = 1500) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for socket event "${event}"`));
    }, timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

describe('Phase 3D Task 2: Real-Time Card Comments Synchronization', () => {
  let httpServer;
  let baseUrl;
  const activeClients = [];

  const workspaceA = new mongoose.Types.ObjectId();
  const workspaceB = new mongoose.Types.ObjectId();
  const boardA = new mongoose.Types.ObjectId();
  const boardB = new mongoose.Types.ObjectId();
  const listA1 = new mongoose.Types.ObjectId();
  const cardA1 = new mongoose.Types.ObjectId();
  const commentA1 = new mongoose.Types.ObjectId();

  const userActorId = new mongoose.Types.ObjectId();
  const userPeerId = new mongoose.Types.ObjectId();
  const userOutsiderId = new mongoose.Types.ObjectId();

  const trackClient = (client) => {
    activeClients.push(client);
    return client;
  };

  beforeAll(async () => {
    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
        resolve();
      });
    });
  });

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockImplementation(async (id) => {
      const str = String(id);
      if (str === userActorId.toString()) {
        return new User({
          _id: userActorId,
          name: 'Ada Lovelace',
          email: 'ada@flowdesk.dev',
          avatar: 'https://example.com/ada.png',
        });
      }
      if (str === userPeerId.toString()) {
        return new User({
          _id: userPeerId,
          name: 'Charles Babbage',
          email: 'charles@flowdesk.dev',
          avatar: 'https://example.com/charles.png',
        });
      }
      if (str === userOutsiderId.toString()) {
        return new User({
          _id: userOutsiderId,
          name: 'Outside Intruder',
          email: 'outsider@flowdesk.dev',
          avatar: '',
        });
      }
      return null;
    });

    jest.spyOn(Board, 'findById').mockImplementation(async (id) => {
      const str = String(id);
      if (str === boardA.toString()) {
        return new Board({
          _id: boardA,
          name: 'Project Alpha',
          workspace: workspaceA,
          createdBy: userActorId,
        });
      }
      if (str === boardB.toString()) {
        return new Board({
          _id: boardB,
          name: 'Project Beta',
          workspace: workspaceB,
          createdBy: userOutsiderId,
        });
      }
      return null;
    });

    jest.spyOn(Card, 'findById').mockImplementation(async (id) => {
      const str = String(id);
      if (str === cardA1.toString()) {
        return new Card({
          _id: cardA1,
          title: 'Implement Comments UI',
          list: listA1,
          board: boardA,
          position: 1000,
        });
      }
      return null;
    });

    jest.spyOn(WorkspaceMember, 'findOne').mockImplementation(async (query) => {
      const wId = String(query.workspace);
      const uId = String(query.user);

      if (wId === workspaceA.toString() && (uId === userActorId.toString() || uId === userPeerId.toString())) {
        return new WorkspaceMember({
          workspace: workspaceA,
          user: query.user,
          role: uId === userActorId.toString() ? 'owner' : 'member',
        });
      }
      if (wId === workspaceB.toString() && uId === userOutsiderId.toString()) {
        return new WorkspaceMember({
          workspace: workspaceB,
          user: userOutsiderId,
          role: 'owner',
        });
      }
      return null;
    });
  });

  afterEach(async () => {
    while (activeClients.length > 0) {
      const client = activeClients.pop();
      try {
        client.removeAllListeners();
        client.disconnect();
      } catch {
        // ignore disconnect errors
      }
    }
    jest.restoreAllMocks();
    await new Promise((r) => setTimeout(r, 20));
  });

  afterAll(async () => {
    await closeSocketServer();
    if (httpServer?.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  it('broadcasts comment:created to authorized board room after persistence', async () => {
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));
    const outsiderClient = trackClient(connectClient(baseUrl, generateToken(userOutsiderId.toString())));

    await Promise.all([waitForConnect(peerClient), waitForConnect(outsiderClient)]);

    const peerJoin = await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });
    const outsiderJoin = await emitWithAck(outsiderClient, 'board:join', { boardId: boardB.toString() });

    expect(peerJoin.ok).toBe(true);
    expect(outsiderJoin.ok).toBe(true);

    const outsiderReceived = [];
    outsiderClient.on('comment:created', (data) => outsiderReceived.push(data));

    const mockCommentDoc = new Comment({
      _id: commentA1,
      card: cardA1,
      board: boardA,
      workspace: workspaceA,
      author: new User({
        _id: userActorId,
        name: 'Ada Lovelace',
        email: 'ada@flowdesk.dev',
        avatar: 'https://example.com/ada.png',
      }),
      content: 'This task needs review.',
    });
    mockCommentDoc.populate = jest.fn().mockResolvedValue(mockCommentDoc);

    jest.spyOn(Comment, 'create').mockResolvedValue(mockCommentDoc);

    const createdPromise = waitForEvent(peerClient, 'comment:created');

    await commentService.createComment(
      cardA1.toString(),
      { content: 'This task needs review.' },
      userActorId.toString()
    );

    const createdEvent = await createdPromise;

    expect(createdEvent.boardId).toBe(boardA.toString());
    expect(createdEvent.cardId).toBe(cardA1.toString());
    expect(createdEvent.actorId).toBe(userActorId.toString());
    expect(createdEvent.comment).toMatchObject({
      id: commentA1.toString(),
      card: cardA1.toString(),
      board: boardA.toString(),
      workspace: workspaceA.toString(),
      content: 'This task needs review.',
      author: {
        id: userActorId.toString(),
        name: 'Ada Lovelace',
        avatar: 'https://example.com/ada.png',
      },
    });

    // Verify sensitive payload fields are NOT leaked
    expect(createdEvent.comment.author).not.toHaveProperty('email');
    expect(createdEvent.comment.author).not.toHaveProperty('password');
    expect(createdEvent.comment).not.toHaveProperty('__v');
    expect(createdEvent.comment).not.toHaveProperty('_id');
    expect(JSON.stringify(createdEvent)).not.toMatch(/password|token|ada@flowdesk\.dev/i);

    // Verify room isolation: outsider never received the event
    await new Promise((r) => setTimeout(r, 80));
    expect(outsiderReceived).toHaveLength(0);
  });

  it('broadcasts comment:deleted to authorized board room after deletion', async () => {
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));
    const outsiderClient = trackClient(connectClient(baseUrl, generateToken(userOutsiderId.toString())));

    await Promise.all([waitForConnect(peerClient), waitForConnect(outsiderClient)]);

    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(outsiderClient, 'board:join', { boardId: boardB.toString() });

    const outsiderReceived = [];
    outsiderClient.on('comment:deleted', (data) => outsiderReceived.push(data));

    const mockCommentDoc = new Comment({
      _id: commentA1,
      card: cardA1,
      board: boardA,
      workspace: workspaceA,
      author: userActorId,
      content: 'To be removed',
    });

    jest.spyOn(Comment, 'findById').mockResolvedValue(mockCommentDoc);
    jest.spyOn(Comment, 'findByIdAndDelete').mockResolvedValue(mockCommentDoc);

    const deletedPromise = waitForEvent(peerClient, 'comment:deleted');

    await commentService.deleteComment(
      cardA1.toString(),
      commentA1.toString(),
      userActorId.toString()
    );

    const deletedEvent = await deletedPromise;

    expect(deletedEvent).toMatchObject({
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      commentId: commentA1.toString(),
      actorId: userActorId.toString(),
    });

    await new Promise((r) => setTimeout(r, 80));
    expect(outsiderReceived).toHaveLength(0);
  });

  it('does not broadcast when persistence fails or authorization fails', async () => {
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));
    await waitForConnect(peerClient);
    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });

    const received = [];
    peerClient.on('comment:created', (d) => received.push(d));
    peerClient.on('comment:deleted', (d) => received.push(d));

    // 1. Creation failure (db throws)
    jest.spyOn(Comment, 'create').mockRejectedValue(new Error('DB write failure'));
    await expect(
      commentService.createComment(cardA1.toString(), { content: 'Fail' }, userActorId.toString())
    ).rejects.toThrow('DB write failure');

    // 2. Unauthorized delete failure
    const mockCommentDoc = new Comment({
      _id: commentA1,
      card: cardA1,
      board: boardA,
      workspace: workspaceA,
      author: userActorId, // Created by userActorId
      content: 'Protected comment',
    });
    jest.spyOn(Comment, 'findById').mockResolvedValue(mockCommentDoc);

    // userPeerId is regular 'member', not author or owner/admin
    await expect(
      commentService.deleteComment(cardA1.toString(), commentA1.toString(), userPeerId.toString())
    ).rejects.toThrow(/Access denied/i);

    await new Promise((r) => setTimeout(r, 80));
    expect(received).toHaveLength(0);
  });
});
