const http = require('http');
const mongoose = require('mongoose');
const { io: createClient } = require('socket.io-client');
const app = require('../src/app');
const User = require('../src/models/User');
const Board = require('../src/models/Board');
const List = require('../src/models/List');
const Card = require('../src/models/Card');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const { generateToken } = require('../src/utils/token');
const { initSocketServer, closeSocketServer } = require('../src/socket');
const cardService = require('../src/services/card.service');
const listService = require('../src/services/list.service');

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

describe('Phase 3B: Backend Real-Time Kanban Board Broadcasting', () => {
  let httpServer;
  let baseUrl;
  const activeClients = [];

  const workspaceA = new mongoose.Types.ObjectId();
  const workspaceB = new mongoose.Types.ObjectId();
  const boardA = new mongoose.Types.ObjectId();
  const boardB = new mongoose.Types.ObjectId();
  const listA1 = new mongoose.Types.ObjectId();
  const listA2 = new mongoose.Types.ObjectId();
  const cardA1 = new mongoose.Types.ObjectId();
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
        return new User({ _id: userActorId, name: 'Actor', email: 'actor@flowdesk.dev' });
      }
      if (str === userPeerId.toString()) {
        return new User({ _id: userPeerId, name: 'Peer', email: 'peer@flowdesk.dev' });
      }
      if (str === userOutsiderId.toString()) {
        return new User({ _id: userOutsiderId, name: 'Outsider', email: 'outsider@flowdesk.dev' });
      }
      return null;
    });

    jest.spyOn(Board, 'findById').mockImplementation(async (id) => {
      const str = String(id);
      if (str === boardA.toString()) return { _id: boardA, workspace: workspaceA };
      if (str === boardB.toString()) return { _id: boardB, workspace: workspaceB };
      return null;
    });

    jest.spyOn(WorkspaceMember, 'findOne').mockImplementation(async ({ workspace, user }) => {
      const ws = String(workspace);
      const u = String(user);
      if (ws === workspaceA.toString() && (u === userActorId.toString() || u === userPeerId.toString())) {
        return { workspace: workspaceA, user, role: 'member' };
      }
      if (ws === workspaceB.toString() && u === userOutsiderId.toString()) {
        return { workspace: workspaceB, user, role: 'owner' };
      }
      return null;
    });
  });

  afterEach(() => {
    while (activeClients.length > 0) {
      const client = activeClients.pop();
      if (client) {
        client.removeAllListeners();
        client.disconnect();
      }
    }
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await closeSocketServer();
    if (httpServer && httpServer.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  it('broadcasts sanitized card lifecycle events only to authorized members joined to that board room', async () => {
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));
    const outsiderClient = trackClient(
      connectClient(baseUrl, generateToken(userOutsiderId.toString()))
    );

    await Promise.all([waitForConnect(peerClient), waitForConnect(outsiderClient)]);

    const peerJoin = await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });
    expect(peerJoin.ok).toBe(true);

    // Outsider cannot join Board A and receives zero Board A events even if joined to Board B
    const outsiderDenied = await emitWithAck(outsiderClient, 'board:join', {
      boardId: boardA.toString(),
    });
    expect(outsiderDenied).toEqual({ ok: false, code: 'FORBIDDEN', error: 'Access denied.' });
    const outsiderOwnJoin = await emitWithAck(outsiderClient, 'board:join', {
      boardId: boardB.toString(),
    });
    expect(outsiderOwnJoin.ok).toBe(true);

    const outsiderReceived = [];
    outsiderClient.on('card:created', (data) => outsiderReceived.push(data));
    outsiderClient.on('card:updated', (data) => outsiderReceived.push(data));
    outsiderClient.on('card:moved', (data) => outsiderReceived.push(data));
    outsiderClient.on('card:deleted', (data) => outsiderReceived.push(data));

    // Mock DB persistence for create, update, move, delete
    const mockCardDoc = new Card({
      _id: cardA1,
      title: 'Live Sync Task',
      description: 'Verify broadcast',
      list: listA1,
      board: boardA,
      position: 1000,
      priority: 'high',
      labels: ['realtime'],
      assignees: [userActorId],
    });
    mockCardDoc.save = jest.fn().mockResolvedValue(mockCardDoc);
    mockCardDoc.populate = jest.fn().mockResolvedValue(mockCardDoc);

    jest.spyOn(List, 'findById').mockImplementation(async (id) => {
      const str = String(id);
      if (str === listA1.toString()) return { _id: listA1, board: boardA };
      if (str === listA2.toString()) return { _id: listA2, board: boardA };
      return null;
    });
    jest.spyOn(Card, 'findOne').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }),
    });
    jest.spyOn(Card, 'create').mockResolvedValue(mockCardDoc);
    jest.spyOn(Card, 'findById').mockResolvedValue(mockCardDoc);
    jest.spyOn(Card, 'findByIdAndDelete').mockResolvedValue(mockCardDoc);

    // 1. Create
    const createdPromise = waitForEvent(peerClient, 'card:created');
    await cardService.createCard(
      listA1.toString(),
      { title: 'Live Sync Task', priority: 'high' },
      userActorId
    );
    const createdEvent = await createdPromise;
    expect(createdEvent.boardId).toBe(boardA.toString());
    expect(createdEvent.listId).toBe(listA1.toString());
    expect(createdEvent.actorId).toBe(userActorId.toString());
    expect(createdEvent.card).toMatchObject({
      id: cardA1.toString(),
      title: 'Live Sync Task',
      board: boardA.toString(),
      list: listA1.toString(),
      priority: 'high',
    });
    expect(createdEvent.card).not.toHaveProperty('__v');
    expect(createdEvent.card).not.toHaveProperty('_id');
    expect(JSON.stringify(createdEvent)).not.toMatch(/password|token/i);

    // 2. Update
    const updatedPromise = waitForEvent(peerClient, 'card:updated');
    await cardService.updateCard(
      cardA1.toString(),
      { title: 'Live Sync Task Updated', priority: 'urgent' },
      userActorId
    );
    const updatedEvent = await updatedPromise;
    expect(updatedEvent.card.title).toBe('Live Sync Task Updated');
    expect(updatedEvent.card.priority).toBe('urgent');

    // 3. Move
    const movedPromise = waitForEvent(peerClient, 'card:moved');
    await cardService.moveCard(
      cardA1.toString(),
      { destinationListId: listA2.toString(), position: 2000 },
      userActorId
    );
    const movedEvent = await movedPromise;
    expect(movedEvent.fromListId).toBe(listA1.toString());
    expect(movedEvent.toListId).toBe(listA2.toString());
    expect(movedEvent.card.list).toBe(listA2.toString());
    expect(movedEvent.card.position).toBe(2000);

    // 4. Delete
    const deletedPromise = waitForEvent(peerClient, 'card:deleted');
    await cardService.deleteCard(cardA1.toString(), userActorId);
    const deletedEvent = await deletedPromise;
    expect(deletedEvent).toMatchObject({
      boardId: boardA.toString(),
      listId: listA2.toString(),
      cardId: cardA1.toString(),
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
    peerClient.on('card:created', (d) => received.push(d));
    peerClient.on('card:updated', (d) => received.push(d));
    peerClient.on('card:deleted', (d) => received.push(d));
    peerClient.on('list:created', (d) => received.push(d));

    jest.spyOn(List, 'findById').mockResolvedValue({ _id: listA1, board: boardA });
    jest.spyOn(Card, 'findOne').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }),
    });
    jest.spyOn(Card, 'create').mockRejectedValue(new Error('DB write timeout'));

    await expect(
      cardService.createCard(listA1.toString(), { title: 'Broken' }, userActorId)
    ).rejects.toThrow('DB write timeout');

    // Unauthorized actor blocked before write/broadcast
    await expect(
      cardService.createCard(listA1.toString(), { title: 'Blocked' }, userOutsiderId)
    ).rejects.toThrow(/Access denied/i);

    jest.spyOn(List, 'findOne').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }),
    });
    jest.spyOn(List, 'create').mockRejectedValue(new Error('List write failed'));
    await expect(
      listService.createList(boardA.toString(), { name: 'Fail List' }, userActorId)
    ).rejects.toThrow('List write failed');

    await new Promise((r) => setTimeout(r, 80));
    expect(received).toHaveLength(0);
  });

  it('broadcasts sanitized list events to the board room after persistence', async () => {
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));
    await waitForConnect(peerClient);
    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });

    const mockList = new List({ _id: listA1, name: 'Backlog', board: boardA, position: 1000 });
    mockList.save = jest.fn().mockResolvedValue(mockList);

    jest.spyOn(List, 'findOne').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }),
    });
    jest.spyOn(List, 'create').mockResolvedValue(mockList);
    jest.spyOn(List, 'findById').mockResolvedValue(mockList);
    jest.spyOn(Card, 'deleteMany').mockResolvedValue({ deletedCount: 0 });
    jest.spyOn(List, 'findByIdAndDelete').mockResolvedValue(mockList);

    const listCreatedPromise = waitForEvent(peerClient, 'list:created');
    await listService.createList(boardA.toString(), { name: 'Backlog' }, userActorId);
    const createdEvent = await listCreatedPromise;
    expect(createdEvent.list).toMatchObject({
      id: listA1.toString(),
      name: 'Backlog',
      board: boardA.toString(),
    });

    const listUpdatedPromise = waitForEvent(peerClient, 'list:updated');
    await listService.updateList(listA1.toString(), { name: 'Ready' }, userActorId);
    const updatedEvent = await listUpdatedPromise;
    expect(updatedEvent.list.name).toBe('Ready');

    const listDeletedPromise = waitForEvent(peerClient, 'list:deleted');
    await listService.deleteList(listA1.toString(), userActorId);
    const deletedEvent = await listDeletedPromise;
    expect(deletedEvent).toMatchObject({
      boardId: boardA.toString(),
      listId: listA1.toString(),
      actorId: userActorId.toString(),
    });
  });
});
