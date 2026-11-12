import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSockets = [];

vi.mock('socket.io-client', () => {
  const createMockSocket = (url, options) => {
    const handlers = new Map();
    const emitted = [];
    const instance = {
      url,
      options,
      connected: false,
      emitted,
      on: vi.fn((event, handler) => {
        handlers.set(event, handler);
      }),
      off: vi.fn((event) => {
        handlers.delete(event);
      }),
      removeAllListeners: vi.fn(() => {
        handlers.clear();
      }),
      connect: vi.fn(() => {
        // Explicit connect trigger managed by test helpers
      }),
      disconnect: vi.fn(() => {
        instance.connected = false;
      }),
      emit: vi.fn((event, payload, ack) => {
        emitted.push({ event, payload });
        if (typeof ack === 'function') {
          ack({ ok: true });
        }
      }),
      trigger(event, ...args) {
        if (event === 'connect') {
          instance.connected = true;
        } else if (event === 'disconnect') {
          instance.connected = false;
        }
        const handler = handlers.get(event);
        if (handler) {
          handler(...args);
        }
      },
    };
    mockSockets.push(instance);
    return instance;
  };

  return {
    io: vi.fn((url, options) => createMockSocket(url, options)),
  };
});

import { io } from 'socket.io-client';
import {
  connectSocket,
  disconnectSocket,
  setActiveWorkspaceRoom,
  setActiveBoardRoom,
  getSocket,
  getSocketStatus,
  subscribeSocketStatus,
} from './socketClient';
import { useAuthStore } from '../store/useAuthStore';
import { setStoredToken } from './apiClient';

describe('Phase 3A: Frontend Socket.IO Client Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSockets.length = 0;
    disconnectSocket();
    window.localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrating: false,
      authError: null,
    });
  });

  it('connects with JWT auth token, updates status, and joins active workspace/board rooms', async () => {
    const statuses = [];
    const unsubscribe = subscribeSocketStatus((next) => statuses.push(next));

    setActiveWorkspaceRoom('ws-1');
    setActiveBoardRoom('board-1');

    const socket = connectSocket('jwt-token-1');
    expect(io).toHaveBeenCalledTimes(1);
    expect(socket.options).toEqual(
      expect.objectContaining({
        autoConnect: false,
        auth: { token: 'jwt-token-1' },
      })
    );
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(getSocketStatus()).toBe('connecting');

    socket.trigger('connect');
    await Promise.resolve();
    await Promise.resolve();

    expect(getSocketStatus()).toBe('connected');
    expect(statuses).toEqual(['connecting', 'connected']);
    expect(socket.emitted).toEqual([
      { event: 'workspace:join', payload: { workspaceId: 'ws-1' } },
      { event: 'board:join', payload: { boardId: 'board-1' } },
    ]);

    setActiveBoardRoom('board-2');
    await Promise.resolve();
    await Promise.resolve();

    expect(socket.emitted).toContainEqual({
      event: 'board:leave',
      payload: { boardId: 'board-1' },
    });
    expect(socket.emitted).toContainEqual({
      event: 'board:join',
      payload: { boardId: 'board-2' },
    });

    unsubscribe();
  });

  it('disconnects cleanly on explicit disconnect and logout', () => {
    setStoredToken('jwt-token-2');
    useAuthStore.setState({
      user: { id: 'u-1', name: 'Alex Morgan' },
      token: 'jwt-token-2',
      isAuthenticated: true,
    });

    const socket = connectSocket('jwt-token-2');
    socket.trigger('connect');
    expect(getSocket()).toBe(socket);
    expect(getSocketStatus()).toBe('connected');

    useAuthStore.getState().logout();

    expect(socket.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(getSocket()).toBeNull();
    expect(getSocketStatus()).toBe('disconnected');
  });

  it('tears down socket immediately on handshake authentication failure', () => {
    const socket = connectSocket('expired-jwt');
    expect(getSocketStatus()).toBe('connecting');

    socket.trigger('connect_error', new Error('Authentication error: Invalid token'));

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(getSocket()).toBeNull();
    expect(getSocketStatus()).toBe('disconnected');
  });

  it('replaces existing socket when JWT token changes', () => {
    const first = connectSocket('token-alpha');
    first.trigger('connect');

    const second = connectSocket('token-beta');

    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
    expect(second.options.auth).toEqual({ token: 'token-beta' });
    expect(getSocket()).toBe(second);
  });
});
