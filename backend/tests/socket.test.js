const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io: createClient } = require('socket.io-client');
const app = require('../src/app');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Board = require('../src/models/Board');
const WorkspaceMember = require('../src/models/WorkspaceMember');
const { generateToken } = require('../src/utils/token');
const { initSocketServer, getIO, closeSocketServer } = require('../src/socket');

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

describe('Phase 3A: Authenticated Socket.IO Foundation', () => {
  let httpServer;
  let ioServer;
  let baseUrl;
  const activeClients = [];

  const mockUserId = new mongoose.Types.ObjectId();
  const mockWorkspaceId = new mongoose.Types.ObjectId();
  const mockBoardId = new mongoose.Types.ObjectId();
  const foreignWorkspaceId = new mongoose.Types.ObjectId();
  const foreignBoardId = new mongoose.Types.ObjectId();

  const trackClient = (client) => {
    activeClients.push(client);
    return client;
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

  afterEach(async () => {
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

  it('rejects connection handshake when JWT token is missing', async () => {
    const client = trackClient(connectSocketClient(baseUrl));

    const err = await new Promise((resolve) => {
      client.on('connect_error', resolve);
      client.on('connect', () => resolve(new Error('Should not connect without token')));
    });

    expect(err.message).toMatch(/Authentication error/i);
    expect(client.connected).toBe(false);
  });

  it('rejects connection handshake when JWT token is invalid or expired', async () => {
    const invalidClient = trackClient(
      connectSocketClient(baseUrl, { auth: { token: 'not.a.valid.jwt' } })
    );

    const invalidErr = await new Promise((resolve) => {
      invalidClient.on('connect_error', resolve);
    });
    expect(invalidErr.message).toMatch(/Authentication error/i);

    const expiredToken = jwt.sign({ sub: mockUserId.toString() }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '-10s',
    });
    const expiredClient = trackClient(
      connectSocketClient(baseUrl, { auth: { token: expiredToken } })
    );

    const expiredErr = await new Promise((resolve) => {
      expiredClient.on('connect_error', resolve);
    });
    expect(expiredErr.message).toMatch(/Authentication error/i);
  });

  it('rejects connection handshake when JWT references a non-existent user', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(null);
    const token = generateToken(mockUserId.toString());

    const client = trackClient(connectSocketClient(baseUrl, { auth: { token } }));

    const err = await new Promise((resolve) => {
      client.on('connect_error', resolve);
    });
    expect(err.message).toMatch(/Authentication error/i);
  });

  it('accepts valid JWT, attaches sanitized user data, and joins private user room', async () => {
    const mockUser = new User({
      _id: mockUserId,
      name: 'Taylor Brooks',
      email: 'taylor@flowdesk.dev',
      avatar: 'https://example.com/taylor.png',
    });
    jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

    const token = generateToken(mockUserId.toString());
    const client = trackClient(connectSocketClient(baseUrl, { auth: { token } }));

    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    const serverSocket = ioServer.sockets.sockets.get(client.id);
    expect(serverSocket).toBeDefined();
    expect(serverSocket.data.userId).toBe(mockUserId.toString());
    expect(serverSocket.data.user).toEqual({
      id: mockUserId.toString(),
      name: 'Taylor Brooks',
      email: 'taylor@flowdesk.dev',
      avatar: 'https://example.com/taylor.png',
    });
    expect(serverSocket.data.user).not.toHaveProperty('password');
    expect(serverSocket.rooms.has(`user:${mockUserId.toString()}`)).toBe(true);
    expect(getIO()).toBe(ioServer);
  });

  it('authorizes workspace room joins/leaves and rejects unauthorized or invalid workspace IDs', async () => {
    const mockUser = new User({
      _id: mockUserId,
      name: 'Taylor Brooks',
      email: 'taylor@flowdesk.dev',
    });
    jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
    jest.spyOn(WorkspaceMember, 'findOne').mockImplementation(async ({ workspace, user }) => {
      if (String(workspace) === mockWorkspaceId.toString() && String(user) === mockUserId.toString()) {
        return { workspace: mockWorkspaceId, user: mockUserId, role: 'admin' };
      }
      return null;
    });

    const token = generateToken(mockUserId.toString());
    const client = trackClient(connectSocketClient(baseUrl, { auth: { token } }));

    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    const serverSocket = ioServer.sockets.sockets.get(client.id);

    const deniedInvalid = await emitWithAck(client, 'workspace:join', {
      workspaceId: 'invalid-object-id',
    });
    expect(deniedInvalid).toEqual({
      ok: false,
      code: 'INVALID_ID',
      error: 'Invalid workspace identifier.',
    });

    const deniedForeign = await emitWithAck(client, 'workspace:join', {
      workspaceId: foreignWorkspaceId.toString(),
    });
    expect(deniedForeign).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      error: 'Access denied.',
    });
    expect(serverSocket.rooms.has(`workspace:${foreignWorkspaceId.toString()}`)).toBe(false);

    const joined = await emitWithAck(client, 'workspace:join', {
      workspaceId: mockWorkspaceId.toString(),
    });
    expect(joined).toEqual({
      ok: true,
      workspaceId: mockWorkspaceId.toString(),
      room: `workspace:${mockWorkspaceId.toString()}`,
      role: 'admin',
    });
    expect(serverSocket.rooms.has(`workspace:${mockWorkspaceId.toString()}`)).toBe(true);

    const left = await emitWithAck(client, 'workspace:leave', {
      workspaceId: mockWorkspaceId.toString(),
    });
    expect(left).toEqual({
      ok: true,
      workspaceId: mockWorkspaceId.toString(),
      room: `workspace:${mockWorkspaceId.toString()}`,
    });
    expect(serverSocket.rooms.has(`workspace:${mockWorkspaceId.toString()}`)).toBe(false);
  });

  it('authorizes board room joins/leaves via parent workspace membership and blocks cross-workspace access', async () => {
    const mockUser = new User({
      _id: mockUserId,
      name: 'Taylor Brooks',
      email: 'taylor@flowdesk.dev',
    });
    jest.spyOn(User, 'findById').mockResolvedValue(mockUser);
    jest.spyOn(Board, 'findById').mockImplementation(async (id) => {
      if (String(id) === mockBoardId.toString()) {
        return { _id: mockBoardId, workspace: mockWorkspaceId };
      }
      if (String(id) === foreignBoardId.toString()) {
        return { _id: foreignBoardId, workspace: foreignWorkspaceId };
      }
      return null;
    });
    jest.spyOn(WorkspaceMember, 'findOne').mockImplementation(async ({ workspace, user }) => {
      if (String(workspace) === mockWorkspaceId.toString() && String(user) === mockUserId.toString()) {
        return { workspace: mockWorkspaceId, user: mockUserId, role: 'member' };
      }
      return null;
    });

    const token = generateToken(mockUserId.toString());
    const client = trackClient(connectSocketClient(baseUrl, { auth: { token } }));

    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    const serverSocket = ioServer.sockets.sockets.get(client.id);

    const deniedForeign = await emitWithAck(client, 'board:join', {
      boardId: foreignBoardId.toString(),
    });
    expect(deniedForeign).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      error: 'Access denied.',
    });
    expect(serverSocket.rooms.has(`board:${foreignBoardId.toString()}`)).toBe(false);

    const missingBoard = await emitWithAck(client, 'board:join', {
      boardId: new mongoose.Types.ObjectId().toString(),
    });
    expect(missingBoard).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      error: 'Access denied.',
    });

    const joined = await emitWithAck(client, 'board:join', {
      boardId: mockBoardId.toString(),
    });
    expect(joined).toEqual({
      ok: true,
      boardId: mockBoardId.toString(),
      workspaceId: mockWorkspaceId.toString(),
      room: `board:${mockBoardId.toString()}`,
      role: 'member',
    });
    expect(serverSocket.rooms.has(`board:${mockBoardId.toString()}`)).toBe(true);

    const left = await emitWithAck(client, 'board:leave', {
      boardId: mockBoardId.toString(),
    });
    expect(left).toEqual({
      ok: true,
      boardId: mockBoardId.toString(),
      room: `board:${mockBoardId.toString()}`,
    });
    expect(serverSocket.rooms.has(`board:${mockBoardId.toString()}`)).toBe(false);
  });
});
