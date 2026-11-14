const http = require('http');
const mongoose = require('mongoose');
const { io: createClient } = require('socket.io-client');
const app = require('../src/app');
const User = require('../src/models/User');
const Board = require('../src/models/Board');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const { generateToken } = require('../src/utils/token');
const { initSocketServer, closeSocketServer } = require('../src/socket');
const { clearPresence } = require('../src/socket/presence');

const connectSocketClient = (url, options = {}) =>
  createClient(url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    ...options,
  });

const emitWithAck = (socket, event, payload) =>
  new Promise((resolve) => {
    socket.emit(event, payload, (response) => resolve(response));
  });

const waitForEvent = (socket, event, timeoutMs = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

describe('Phase 3C: Backend Board Presence Management', () => {
  let httpServer;
  let ioServer;
  let baseUrl;
  const activeClients = [];

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const userCId = new mongoose.Types.ObjectId();

  const workspace1Id = new mongoose.Types.ObjectId();
  const workspace2Id = new mongoose.Types.ObjectId();

  const board1Id = new mongoose.Types.ObjectId();
  const board2Id = new mongoose.Types.ObjectId();
  const foreignBoardId = new mongoose.Types.ObjectId();

  const userRecords = {
    [userAId.toString()]: {
      _id: userAId,
      id: userAId.toString(),
      name: 'Alice Analyst',
      email: 'alice@flowdesk.app',
      avatar: 'https://example.com/alice.png',
    },
    [userBId.toString()]: {
      _id: userBId,
      id: userBId.toString(),
      name: 'Bob Builder',
      email: 'bob@flowdesk.app',
      avatar: 'https://example.com/bob.png',
    },
    [userCId.toString()]: {
      _id: userCId,
      id: userCId.toString(),
      name: 'Charlie Critic',
      email: 'charlie@flowdesk.app',
      avatar: '',
    },
  };

  const trackClient = (client) => {
    activeClients.push(client);
    return client;
  };

  const createAuthClient = (userId) => {
    const token = generateToken(userId.toString());
    return trackClient(connectSocketClient(baseUrl, { auth: { token } }));
  };

  beforeAll(async () => {
    httpServer = http.createServer(app);
    ioServer = initSocketServer(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        const address = httpServer.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  beforeEach(() => {
    clearPresence();
    jest.spyOn(User, 'findById').mockImplementation(async (id) => {
      const record = userRecords[String(id)];
      return record ? new User(record) : null;
    });

    jest.spyOn(Board, 'findById').mockImplementation(async (id) => {
      const strId = String(id);
      if (strId === board1Id.toString() || strId === board2Id.toString()) {
        return { _id: id, workspace: workspace1Id };
      }
      if (strId === foreignBoardId.toString()) {
        return { _id: foreignBoardId, workspace: workspace2Id };
      }
      return null;
    });

    jest.spyOn(WorkspaceMember, 'findOne').mockImplementation(async ({ workspace, user }) => {
      const wId = String(workspace);
      const uId = String(user);

      // Alice & Bob belong to Workspace 1
      if (wId === workspace1Id.toString() && (uId === userAId.toString() || uId === userBId.toString())) {
        return { workspace: workspace1Id, user: new mongoose.Types.ObjectId(uId), role: 'member' };
      }

      // Charlie belongs exclusively to Workspace 2
      if (wId === workspace2Id.toString() && uId === userCId.toString()) {
        return { workspace: workspace2Id, user: userCId, role: 'member' };
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
    clearPresence();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await closeSocketServer();
    if (httpServer && httpServer.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  it('provides an initial collaborator snapshot on board:join and broadcasts presence:join to existing peers', async () => {
    const clientA = createAuthClient(userAId);
    await new Promise((resolve) => clientA.on('connect', resolve));

    const joinA = await emitWithAck(clientA, 'board:join', { boardId: board1Id.toString() });
    expect(joinA.ok).toBe(true);
    expect(joinA.collaborators).toHaveLength(1);
    expect(joinA.collaborators[0]).toEqual({
      id: userAId.toString(),
      name: 'Alice Analyst',
      avatar: 'https://example.com/alice.png',
    });

    const clientB = createAuthClient(userBId);
    await new Promise((resolve) => clientB.on('connect', resolve));

    const presenceJoinPromise = waitForEvent(clientA, 'presence:join');

    const joinB = await emitWithAck(clientB, 'board:join', { boardId: board1Id.toString() });
    expect(joinB.ok).toBe(true);
    expect(joinB.collaborators).toHaveLength(2);
    expect(joinB.collaborators.map((c) => c.id).sort()).toEqual(
      [userAId.toString(), userBId.toString()].sort()
    );

    const broadcastEvent = await presenceJoinPromise;
    expect(broadcastEvent.boardId).toBe(board1Id.toString());
    expect(broadcastEvent.user).toEqual({
      id: userBId.toString(),
      name: 'Bob Builder',
      avatar: 'https://example.com/bob.png',
    });
  });

  it('broadcasts presence:leave when a user explicitly leaves the board via board:leave', async () => {
    const clientA = createAuthClient(userAId);
    const clientB = createAuthClient(userBId);
    await Promise.all([
      new Promise((resolve) => clientA.on('connect', resolve)),
      new Promise((resolve) => clientB.on('connect', resolve)),
    ]);

    await emitWithAck(clientA, 'board:join', { boardId: board1Id.toString() });
    await emitWithAck(clientB, 'board:join', { boardId: board1Id.toString() });

    const leavePromise = waitForEvent(clientA, 'presence:leave');

    const leaveRes = await emitWithAck(clientB, 'board:leave', { boardId: board1Id.toString() });
    expect(leaveRes.ok).toBe(true);

    const leaveEvent = await leavePromise;
    expect(leaveEvent.boardId).toBe(board1Id.toString());
    expect(leaveEvent.userId).toBe(userBId.toString());
  });

  it('handles multiple sockets for one user: deduplicates snapshots and emits presence:leave only on final socket disconnect', async () => {
    const clientA = createAuthClient(userAId);
    await new Promise((resolve) => clientA.on('connect', resolve));
    await emitWithAck(clientA, 'board:join', { boardId: board1Id.toString() });

    const clientB1 = createAuthClient(userBId); // Tab 1 for Bob
    await new Promise((resolve) => clientB1.on('connect', resolve));
    const joinB1 = await emitWithAck(clientB1, 'board:join', { boardId: board1Id.toString() });
    expect(joinB1.collaborators).toHaveLength(2);

    // Bob opens Tab 2
    const clientB2 = createAuthClient(userBId); // Tab 2 for Bob
    await new Promise((resolve) => clientB2.on('connect', resolve));

    let unexpectedPresenceJoin = false;
    clientA.on('presence:join', () => {
      unexpectedPresenceJoin = true;
    });

    const joinB2 = await emitWithAck(clientB2, 'board:join', { boardId: board1Id.toString() });
    expect(joinB2.ok).toBe(true);
    // Bob should appear only once in the snapshot even though he has 2 tabs
    expect(joinB2.collaborators).toHaveLength(2);
    expect(joinB2.collaborators.map((c) => c.id).sort()).toEqual(
      [userAId.toString(), userBId.toString()].sort()
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(unexpectedPresenceJoin).toBe(false);

    // Bob closes Tab 1 (clientB1 disconnects)
    let prematureLeaveEmitted = false;
    clientA.on('presence:leave', () => {
      prematureLeaveEmitted = true;
    });

    clientB1.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(prematureLeaveEmitted).toBe(false);

    // Bob closes Tab 2 (clientB2 disconnects) - now presence:leave must be emitted
    const finalLeavePromise = waitForEvent(clientA, 'presence:leave');
    clientB2.disconnect();

    const finalLeave = await finalLeavePromise;
    expect(finalLeave.boardId).toBe(board1Id.toString());
    expect(finalLeave.userId).toBe(userBId.toString());
  });

  it('switching boards automatically cleans up presence on the previous board', async () => {
    const clientA1 = createAuthClient(userAId); // Viewing Board 1
    const clientA2 = createAuthClient(userAId); // Viewing Board 2
    const clientB = createAuthClient(userBId); // Will switch from Board 1 to Board 2

    await Promise.all([
      new Promise((resolve) => clientA1.on('connect', resolve)),
      new Promise((resolve) => clientA2.on('connect', resolve)),
      new Promise((resolve) => clientB.on('connect', resolve)),
    ]);

    await emitWithAck(clientA1, 'board:join', { boardId: board1Id.toString() });
    await emitWithAck(clientA2, 'board:join', { boardId: board2Id.toString() });

    // Bob joins Board 1
    await emitWithAck(clientB, 'board:join', { boardId: board1Id.toString() });

    const leavePromiseBoard1 = waitForEvent(clientA1, 'presence:leave');
    const joinPromiseBoard2 = waitForEvent(clientA2, 'presence:join');

    // Bob navigates directly to Board 2 without manual leave
    const switchRes = await emitWithAck(clientB, 'board:join', { boardId: board2Id.toString() });
    expect(switchRes.ok).toBe(true);

    const leaveEvent = await leavePromiseBoard1;
    expect(leaveEvent.boardId).toBe(board1Id.toString());
    expect(leaveEvent.userId).toBe(userBId.toString());

    const joinEvent = await joinPromiseBoard2;
    expect(joinEvent.boardId).toBe(board2Id.toString());
    expect(joinEvent.user.id).toBe(userBId.toString());
  });

  it('enforces cross-workspace isolation: unauthorized user cannot join board presence', async () => {
    const clientC = createAuthClient(userCId); // Member of Workspace 2 only
    await new Promise((resolve) => clientC.on('connect', resolve));

    const denied = await emitWithAck(clientC, 'board:join', { boardId: board1Id.toString() });
    expect(denied.ok).toBe(false);
    expect(denied.code).toBe('FORBIDDEN');
  });

  it('repeated joins and leaves are safe and idempotent', async () => {
    const clientA = createAuthClient(userAId);
    await new Promise((resolve) => clientA.on('connect', resolve));

    const join1 = await emitWithAck(clientA, 'board:join', { boardId: board1Id.toString() });
    const join2 = await emitWithAck(clientA, 'board:join', { boardId: board1Id.toString() });
    expect(join1.ok).toBe(true);
    expect(join2.ok).toBe(true);
    expect(join2.collaborators).toHaveLength(1);

    const leave1 = await emitWithAck(clientA, 'board:leave', { boardId: board1Id.toString() });
    const leave2 = await emitWithAck(clientA, 'board:leave', { boardId: board1Id.toString() });
    expect(leave1.ok).toBe(true);
    expect(leave2.ok).toBe(true);
  });
});
