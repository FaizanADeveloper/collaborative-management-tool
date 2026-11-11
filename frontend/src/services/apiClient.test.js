import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiClient,
  ApiClientError,
  getStoredToken,
  setStoredToken,
  registerUnauthorizedHandler,
} from './apiClient';

describe('Centralized API Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    registerUnauthorizedHandler(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('attaches Authorization Bearer token for protected endpoints', async () => {
    setStoredToken('jwt-test-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: { workspaces: [] } }),
    });
    globalThis.fetch = fetchMock;

    const result = await apiClient.get('/workspaces');
    expect(result.data.workspaces).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer jwt-test-token');
  });

  it('omits Authorization header when skipAuth is enabled', async () => {
    setStoredToken('existing-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    });
    globalThis.fetch = fetchMock;

    await apiClient.post('/auth/login', { email: 'a@b.com', password: 'Secret12' }, { skipAuth: true });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('normalizes Zod validation errors into fieldErrors map', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Validation Error',
        errors: [
          { field: 'email', message: 'Please provide a valid email address' },
          { field: 'password', message: 'Password must contain at least one number' },
        ],
      }),
    });
    globalThis.fetch = fetchMock;

    await expect(
      apiClient.post('/auth/register', { name: 'Jo', email: 'bad', password: 'abc' }, { skipAuth: true })
    ).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 400,
      message: 'Validation Error',
      fieldErrors: {
        email: 'Please provide a valid email address',
        password: 'Password must contain at least one number',
      },
    });
  });

  it('clears stored token and notifies handler on 401 Unauthorized', async () => {
    setStoredToken('expired-jwt');
    const onUnauth = vi.fn();
    registerUnauthorizedHandler(onUnauth);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Access denied. Invalid, expired, or missing authentication token.',
      }),
    });

    await expect(apiClient.get('/auth/me')).rejects.toBeInstanceOf(ApiClientError);
    expect(getStoredToken()).toBeNull();
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });

  it('normalizes network failures cleanly', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      status: 0,
      isNetworkError: true,
    });
  });
});
