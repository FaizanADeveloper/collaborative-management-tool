import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { EmptyState } from './components/common/EmptyState';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { setStoredToken } from './services/apiClient';

describe('Frontend Application Shell & Protected Routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    document.documentElement.classList.add('dark');
    useUIStore.setState({
      theme: 'dark',
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
    });
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrating: false,
      authError: null,
    });
  });

  it('redirects unauthenticated visitors to the Flowdesk login screen and toggles light/dark mode', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /sign in to flowdesk/i })).toBeInTheDocument();
    expect(screen.getAllByText('Flowdesk').length).toBeGreaterThan(0);

    const authThemeBtn = screen.getByRole('button', { name: /switch to light theme/i });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(authThemeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it('renders authenticated shell and supports light/dark theme switching', async () => {
    setStoredToken('valid-jwt-token');
    useAuthStore.setState({
      token: 'valid-jwt-token',
      isHydrating: true,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        data: { user: { id: 'u-1', name: 'Alex Morgan', email: 'alex@example.com' } },
      }),
    });

    render(<App />);
    const dashboardMatches = await screen.findAllByText(/Dashboard/i);
    expect(dashboardMatches.length).toBeGreaterThan(0);

    const themeButton = screen.getByRole('button', { name: /switch to light theme/i });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(themeButton);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it('renders EmptyState with actionable CTA', () => {
    let clicked = false;
    render(
      <EmptyState
        title="No boards found"
        description="Create your first Kanban board to organize lists and cards."
        actionLabel="Create Board"
        onAction={() => {
          clicked = true;
        }}
      />
    );

    expect(screen.getByText('No boards found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create Board' }));
    expect(clicked).toBe(true);
  });

  it('renders accessible ConfirmDialog when open', () => {
    let confirmed = false;
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {
          confirmed = true;
        }}
        title="Delete List"
        description="Deleting this list will permanently delete all cards inside it."
        confirmLabel="Delete List"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete List' }));
    expect(confirmed).toBe(true);
  });
});
