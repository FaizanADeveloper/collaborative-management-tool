const http = require('http');
const mongoose = require('mongoose');
const { io: createClient } = require('socket.io-client');
const app = require('../src/app');
const User = require('../src/models/User');
const Board = require('../src/models/Board');
const Card = require('../src/models/Card');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const { generateToken } = require('../src/utils/token');
const { initSocketServer, closeSocketServer } = require('../src/socket');

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

describe('Phase 3D Task 3: Real-Time Typing Indicators & Card Activity', () => {
  let httpServer;
  let baseUrl;
  const activeClients = [];

  const workspaceA = new mongoose.Types.ObjectId();
  const workspaceB = new mongoose.Types.ObjectId();
  const boardA = new mongoose.Types.ObjectId();
  const boardB = new mongoose.Types.ObjectId();
  const cardA1 = new mongoose.Types.ObjectId();
  const cardB1 = new mongoose.Types.ObjectId();

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

    jest.spyOn(Card, 'findById').mockImplementation((id) => {
      const str = String(id);
      const isCardA = str === cardA1.toString();
      const isCardB = str === cardB1.toString();

      if (!isCardA && !isCardB) {
        return {
          select: () => ({
            lean: async () => null,
          }),
        };
      }

      return {
        select: () => ({
          lean: async () => ({
            _id: isCardA ? cardA1 : cardB1,
            board: isCardA ? boardA : boardB,
          }),
        }),
      };
    });

    jest.spyOn(WorkspaceMember, 'findOne').mockImplementation(async (query) => {
      const wId = String(query.workspace);
      const uId = String(query.user);

      if (
        wId === workspaceA.toString() &&
        (uId === userActorId.toString() || uId === userPeerId.toString())
      ) {
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

  it('relays card:typing with sanitized user metadata to authorized peers in same board room', async () => {
    const actorClient = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));
    const outsiderClient = trackClient(connectClient(baseUrl, generateToken(userOutsiderId.toString())));

    await Promise.all([
      waitForConnect(actorClient),
      waitForConnect(peerClient),
      waitForConnect(outsiderClient),
    ]);

    await emitWithAck(actorClient, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(outsiderClient, 'board:join', { boardId: boardB.toString() });

    const actorReceived = [];
    const outsiderReceived = [];
    actorClient.on('card:typing', (d) => actorReceived.push(d));
    outsiderClient.on('card:typing', (d) => outsiderReceived.push(d));

    const typingPromise = waitForEvent(peerClient, 'card:typing');

    // Actor sends typing with client-tampered spoof payload
    const ack = await emitWithAck(actorClient, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
      user: { id: 'spoofed-id', name: 'Spoofed Name', role: 'admin' }, // must be ignored
    });

    expect(ack).toMatchObject({
      ok: true,
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
    });

    const receivedEvent = await typingPromise;

    expect(receivedEvent).toMatchObject({
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
      user: {
        id: userActorId.toString(),
        name: 'Ada Lovelace',
        avatar: 'https://example.com/ada.png',
      },
    });

    // Sanitization: verify no email, password, or spoofed role in payload
    expect(receivedEvent.user).not.toHaveProperty('email');
    expect(receivedEvent.user).not.toHaveProperty('password');
    expect(receivedEvent.user).not.toHaveProperty('role');

    // Sender must NOT receive their own typing event
    expect(actorReceived).toHaveLength(0);

    // Outsider on board B must NOT receive board A typing
    await new Promise((r) => setTimeout(r, 80));
    expect(outsiderReceived).toHaveLength(0);
  });

  it('relays isTyping: false when user stops typing', async () => {
    const actorClient = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));

    await Promise.all([waitForConnect(actorClient), waitForConnect(peerClient)]);
    await emitWithAck(actorClient, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });

    const stopPromise = waitForEvent(peerClient, 'card:typing');

    await emitWithAck(actorClient, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: false,
    });

    const receivedEvent = await stopPromise;
    expect(receivedEvent).toMatchObject({
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: false,
      user: {
        id: userActorId.toString(),
      },
    });
  });

  it('rejects typing if card does not belong to the board or board is mismatched', async () => {
    const actorClient = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    await waitForConnect(actorClient);
    await emitWithAck(actorClient, 'board:join', { boardId: boardA.toString() });

    // cardB1 belongs to boardB, but actor sends it with boardA
    const ack = await emitWithAck(actorClient, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardB1.toString(),
      isTyping: true,
    });

    expect(ack.ok).toBe(false);
    expect(ack.code).toBe('FORBIDDEN');
    expect(ack.error).toMatch(/does not belong/i);
  });

  it('rejects typing if socket has not joined the board room', async () => {
    const actorClient = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    await waitForConnect(actorClient);
    // Did NOT call board:join

    const ack = await emitWithAck(actorClient, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
    });

    expect(ack.ok).toBe(false);
    expect(ack.code).toBe('FORBIDDEN');
    expect(ack.error).toMatch(/must join the board room/i);
  });

  it('rejects typing with invalid boardId or cardId format', async () => {
    const actorClient = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    await waitForConnect(actorClient);

    const badBoardAck = await emitWithAck(actorClient, 'card:typing', {
      boardId: 'not-an-id',
      cardId: cardA1.toString(),
      isTyping: true,
    });
    expect(badBoardAck.ok).toBe(false);
    expect(badBoardAck.code).toBe('INVALID_ID');

    const badCardAck = await emitWithAck(actorClient, 'card:typing', {
      boardId: boardA.toString(),
      cardId: '123',
      isTyping: true,
    });
    expect(badCardAck.ok).toBe(false);
    expect(badCardAck.code).toBe('INVALID_ID');
  });

  it('cleans up typing indicator and broadcasts isTyping: false when user leaves board room', async () => {
    const actorClient = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));

    await Promise.all([waitForConnect(actorClient), waitForConnect(peerClient)]);
    await emitWithAck(actorClient, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });

    // Actor starts typing
    await emitWithAck(actorClient, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
    });

    // Expect peer to receive isTyping: false upon actor's board:leave
    const leaveCleanupPromise = waitForEvent(peerClient, 'card:typing');

    await emitWithAck(actorClient, 'board:leave', { boardId: boardA.toString() });

    const leaveEvent = await leaveCleanupPromise;
    expect(leaveEvent).toMatchObject({
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: false,
      user: {
        id: userActorId.toString(),
      },
    });
  });

  it('cleans up typing indicator and broadcasts isTyping: false when user disconnects unexpectedly', async () => {
    const actorClient = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));

    await Promise.all([waitForConnect(actorClient), waitForConnect(peerClient)]);
    await emitWithAck(actorClient, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });

    // Actor starts typing
    await emitWithAck(actorClient, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
    });

    // Expect peer to receive isTyping: false upon actor socket disconnect
    const disconnectCleanupPromise = waitForEvent(peerClient, 'card:typing');

    actorClient.disconnect();

    const disconnectEvent = await disconnectCleanupPromise;
    expect(disconnectEvent).toMatchObject({
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: false,
      user: {
        id: userActorId.toString(),
      },
    });
  });

  it('does not broadcast isTyping: false when one tab stops if another tab of the same user is still typing', async () => {
    const actorTab1 = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    const actorTab2 = trackClient(connectClient(baseUrl, generateToken(userActorId.toString())));
    const peerClient = trackClient(connectClient(baseUrl, generateToken(userPeerId.toString())));

    await Promise.all([
      waitForConnect(actorTab1),
      waitForConnect(actorTab2),
      waitForConnect(peerClient),
    ]);

    await emitWithAck(actorTab1, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(actorTab2, 'board:join', { boardId: boardA.toString() });
    await emitWithAck(peerClient, 'board:join', { boardId: boardA.toString() });

    await emitWithAck(actorTab1, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
    });
    await emitWithAck(actorTab2, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: true,
    });

    const receivedFalseEvents = [];
    peerClient.on('card:typing', (evt) => {
      if (evt.isTyping === false) {
        receivedFalseEvents.push(evt);
      }
    });

    // Tab 1 stops typing
    await emitWithAck(actorTab1, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: false,
    });

    await new Promise((r) => setTimeout(r, 80));
    expect(receivedFalseEvents).toHaveLength(0);

    // Now Tab 2 also stops typing
    const finalStopPromise = waitForEvent(peerClient, 'card:typing');
    await emitWithAck(actorTab2, 'card:typing', {
      boardId: boardA.toString(),
      cardId: cardA1.toString(),
      isTyping: false,
    });

    const finalEvent = await finalStopPromise;
    expect(finalEvent.isTyping).toBe(false);
  });
});
