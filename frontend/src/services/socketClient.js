import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;
let desiredWorkspaceId = null;
let desiredBoardId = null;
let joinedWorkspaceId = null;
let joinedBoardId = null;
let connectionStatus = 'disconnected';

const statusListeners = new Set();
const eventHandlers = new Map();

const setStatus = (nextStatus) => {
  if (connectionStatus === nextStatus) return;
  connectionStatus = nextStatus;
  for (const listener of statusListeners) {
    try {
      listener(connectionStatus);
    } catch {
      // Ignore subscriber errors
    }
  }
};

/**
 * Resolves the Socket.IO server base URL from explicit VITE_SOCKET_URL,
 * VITE_API_URL origin fallback, or same-origin Vite /socket.io proxy.
 *
 * @returns {string|undefined}
 */
export const resolveSocketUrl = () => {
  const configuredSocketUrl = import.meta.env?.VITE_SOCKET_URL;
  if (typeof configuredSocketUrl === 'string' && configuredSocketUrl.trim()) {
    return configuredSocketUrl.trim().replace(/\/+$/, '');
  }

  const configuredApiUrl = import.meta.env?.VITE_API_URL;
  if (typeof configuredApiUrl === 'string' && /^https?:\/\//i.test(configuredApiUrl.trim())) {
    try {
      return new URL(configuredApiUrl.trim()).origin;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const emitWithAck = (event, payload) =>
  new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ ok: false, error: 'Socket not connected' });
      return;
    }
    socket.emit(event, payload, (response) => {
      resolve(response || { ok: false });
    });
  });

const syncDesiredRooms = async () => {
  if (!socket || !socket.connected) return;

  if (joinedWorkspaceId && joinedWorkspaceId !== desiredWorkspaceId) {
    const previousWorkspace = joinedWorkspaceId;
    joinedWorkspaceId = null;
    await emitWithAck('workspace:leave', { workspaceId: previousWorkspace });
  }

  if (desiredWorkspaceId && joinedWorkspaceId !== desiredWorkspaceId) {
    const targetWorkspace = desiredWorkspaceId;
    const res = await emitWithAck('workspace:join', { workspaceId: targetWorkspace });
    if (res?.ok && desiredWorkspaceId === targetWorkspace) {
      joinedWorkspaceId = targetWorkspace;
    }
  }

  if (joinedBoardId && joinedBoardId !== desiredBoardId) {
    const previousBoard = joinedBoardId;
    joinedBoardId = null;
    await emitWithAck('board:leave', { boardId: previousBoard });
  }

  if (desiredBoardId && joinedBoardId !== desiredBoardId) {
    const targetBoard = desiredBoardId;
    const res = await emitWithAck('board:join', { boardId: targetBoard });
    if (res?.ok && desiredBoardId === targetBoard) {
      joinedBoardId = targetBoard;
    }
  }
};

/**
 * Establishes or reuses an authenticated Socket.IO connection for the active JWT token.
 *
 * @param {string|null} token
 */
export const connectSocket = (token) => {
  if (typeof window === 'undefined' || !token) {
    disconnectSocket();
    return null;
  }

  if (socket && currentToken === token) {
    if (!socket.connected && connectionStatus !== 'connecting') {
      setStatus('connecting');
      socket.connect();
    }
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    joinedWorkspaceId = null;
    joinedBoardId = null;
  }

  const targetUrl = resolveSocketUrl();
  const client = io(targetUrl, {
    autoConnect: false,
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  currentToken = token;
  socket = client;
  setStatus('connecting');

  for (const [event, handlers] of eventHandlers.entries()) {
    for (const handler of handlers) {
      client.on(event, handler);
    }
  }

  client.on('connect', () => {
    setStatus('connected');
    syncDesiredRooms();
  });

  client.on('disconnect', () => {
    joinedWorkspaceId = null;
    joinedBoardId = null;
    setStatus('disconnected');
  });

  client.on('connect_error', (err) => {
    setStatus('error');
    if (/Authentication error/i.test(err?.message || '')) {
      disconnectSocket();
    }
  });

  client.connect();
  return client;
};

/**
 * Cleanly disconnects the active Socket.IO connection and clears room tracking state.
 */
export const disconnectSocket = () => {
  desiredWorkspaceId = null;
  desiredBoardId = null;
  joinedWorkspaceId = null;
  joinedBoardId = null;
  currentToken = null;

  if (socket) {
    const activeSocket = socket;
    socket = null;
    activeSocket.removeAllListeners();
    activeSocket.disconnect();
  }

  setStatus('disconnected');
};

export const setActiveWorkspaceRoom = (workspaceId) => {
  desiredWorkspaceId = workspaceId || null;
  syncDesiredRooms();
};

export const setActiveBoardRoom = (boardId) => {
  desiredBoardId = boardId || null;
  syncDesiredRooms();
};

export const getSocket = () => socket;

export const getSocketStatus = () => connectionStatus;

export const subscribeSocketStatus = (listener) => {
  if (typeof listener !== 'function') return () => {};
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

/**
 * Registers a Socket.IO event handler that persists across socket reconnects
 * until the returned cleanup function is invoked.
 *
 * @param {string} event
 * @param {Function} handler
 * @returns {() => void}
 */
export const subscribeSocketEvent = (event, handler) => {
  if (typeof event !== 'string' || !event || typeof handler !== 'function') {
    return () => {};
  }

  let handlers = eventHandlers.get(event);
  if (!handlers) {
    handlers = new Set();
    eventHandlers.set(event, handlers);
  }

  if (!handlers.has(handler)) {
    handlers.add(handler);
    if (socket) {
      socket.on(event, handler);
    }
  }

  return () => {
    const activeHandlers = eventHandlers.get(event);
    if (activeHandlers) {
      activeHandlers.delete(handler);
      if (activeHandlers.size === 0) {
        eventHandlers.delete(event);
      }
    }
    if (socket) {
      socket.off(event, handler);
    }
  };
};
