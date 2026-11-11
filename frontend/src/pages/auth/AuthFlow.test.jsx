import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../App';
import { useAuthStore } from '../../store/useAuthStore';
import { getStoredToken, setStoredToken } from '../../services/apiClient';

describe('Authentication Flow & Session Hydration', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrating: false,
      authError: null,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('logs in through /api/auth/login, persists JWT, and redirects to dashboard', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        data: {
          user: { id: 'u-1', name: 'Jane Doe', email: 'jane@example.com' },
          token: 'real-backend-jwt',
        },
      }),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(getStoredToken()).toBe('real-backend-jwt');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  it('displays standardized backend 401 error on invalid login credentials', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Invalid email or password',
      }),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('enforces password validation rules on signup before calling API', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password \*/i), 'lowercase');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hydrates active user session on page refresh using GET /api/auth/me', async () => {
    setStoredToken('persisted-jwt-token');
    useAuthStore.setState({ token: 'persisted-jwt-token', isHydrating: true });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        data: {
          user: { id: 'u-9', name: 'Hydrated User', email: 'hydrated@example.com' },
        },
      }),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isHydrating).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user.email).toBe('hydrated@example.com');
    });
  });

  it('clears invalid token when /api/auth/me returns 401 during hydration', async () => {
    setStoredToken('stale-jwt-token');
    useAuthStore.setState({ token: 'stale-jwt-token', isHydrating: true });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        message: 'Access denied. Invalid, expired, or missing authentication token.',
      }),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isHydrating).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(getStoredToken()).toBeNull();
    });
  });
});
