import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import { BoardsPage } from './ProjectsPage';
import { TeamPage } from './TeamPage';
import { TaskDetailsDrawer } from '../components/tasks/TaskDetailsDrawer';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useBoardStore } from '../store/useBoardStore';
import { useUIStore } from '../store/useUIStore';
import { getStoredToken, setStoredToken } from '../services/apiClient';

const mockJsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'application/json' },
  json: async () => body,
});

describe('Edge Cases, Error Recovery & Cross-Store Lifecycle', () => {
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
    useWorkspaceStore.getState().resetWorkspaceState();
    useBoardStore.getState().resetBoardState();
    useUIStore.setState({
      mobileSidebarOpen: false,
      sidebarCollapsed: false,
      isCommandPaletteOpen: false,
      toasts: [],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('hydrates workspace -> boards -> lists -> cards cleanly and purges all stores on logout', async () => {
    const user = userEvent.setup();
    setStoredToken('session-jwt');
    useAuthStore.setState({ token: 'session-jwt', isHydrating: true });

    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/api/auth/me') {
        return mockJsonResponse(200, {
          success: true,
          data: { user: { id: 'u-1', name: 'Alice Owner', email: 'alice@example.com' } },
        });
      }
      if (url === '/api/workspaces') {
        return mockJsonResponse(200, {
          success: true,
          data: { workspaces: [{ id: 'ws-1', name: 'Acme Org', role: 'owner' }] },
        });
      }
      if (url === '/api/workspaces/ws-1') {
        return mockJsonResponse(200, {
          success: true,
          data: { workspace: { id: 'ws-1', name: 'Acme Org', role: 'owner', inviteCode: 'ACME1234' } },
        });
      }
      if (url === '/api/workspaces/ws-1/members') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            members: [{ id: 'u-1', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' }],
          },
        });
      }
      if (url === '/api/workspaces/ws-1/boards') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            boards: [{ id: 'b-1', name: 'Engineering', description: 'Sprint board', createdBy: 'u-1' }],
          },
        });
      }
      if (url === '/api/boards/b-1') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            board: { id: 'b-1', name: 'Engineering', description: 'Sprint board', createdBy: 'u-1' },
          },
        });
      }
      if (url === '/api/boards/b-1/lists') {
        return mockJsonResponse(200, {
          success: true,
          data: { lists: [{ id: 'l-1', name: 'Backlog', board: 'b-1', position: 1000 }] },
        });
      }
      if (url === '/api/lists/l-1/cards') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            cards: [
              {
                id: 'c-1',
                title: 'Sensitive Workspace Task',
                list: 'l-1',
                board: 'b-1',
                position: 1000,
                priority: 'high',
                assignees: [{ id: 'u-1', name: 'Alice Owner' }],
              },
            ],
          },
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText(/welcome back, alice/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(useBoardStore.getState().cardsByList['l-1']).toHaveLength(1);
    });

    // Responsive mobile menu opens and closes cleanly
    await user.click(screen.getByRole('button', { name: /open navigation menu/i }));
    expect(useUIStore.getState().mobileSidebarOpen).toBe(true);
    await user.click(screen.getByRole('button', { name: /close navigation menu/i }));
    expect(useUIStore.getState().mobileSidebarOpen).toBe(false);

    // Open profile menu and sign out -> verifies full cross-store cleanup
    await user.click(screen.getByRole('button', { name: /alice/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

    expect(await screen.findByRole('heading', { name: /sign in to syncflow/i })).toBeInTheDocument();
    expect(getStoredToken()).toBeNull();
    expect(useWorkspaceStore.getState().workspaces).toEqual([]);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
    expect(useBoardStore.getState().boards).toEqual([]);
    expect(useBoardStore.getState().cardsByList).toEqual({});
  });

  it('renders clear API error feedback on BoardsPage and TeamPage without crashing', () => {
    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Acme Org', role: 'owner' }],
      activeWorkspaceId: 'ws-1',
      activeWorkspaceDetails: { id: 'ws-1', name: 'Acme Org', role: 'owner' },
      workspaceError: 'Unable to load workspace members',
      hasLoadedWorkspaces: true,
    });
    useBoardStore.setState({
      boards: [],
      boardError: 'Failed to load workspace boards',
      hasLoadedBoards: true,
    });

    const { rerender } = render(
      <MemoryRouter>
        <BoardsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load workspace boards');

    rerender(
      <MemoryRouter>
        <TeamPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load workspace members');
  });

  it('triggers sequential position rebalancing when card gap precision drops below threshold', async () => {
    const patchCalls = [];
    useBoardStore.setState({
      cardsByList: {
        'l-1': [
          { id: 'c-1', title: 'One', list: 'l-1', position: 1, assignees: [] },
          { id: 'c-2', title: 'Two', list: 'l-1', position: 1 + 1e-6, assignees: [] },
          { id: 'c-3', title: 'Three', list: 'l-1', position: 1000, assignees: [] },
        ],
      },
    });

    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/cards/c-3/move' && init.method === 'PATCH') {
        return mockJsonResponse(200, {
          success: true,
          data: { card: { id: 'c-3', title: 'Three', list: 'l-1', position: 1, assignees: [] } },
        });
      }
      if (url.startsWith('/api/cards/') && init.method === 'PATCH') {
        patchCalls.push({ url, body: JSON.parse(init.body) });
        return mockJsonResponse(200, {
          success: true,
          data: {
            card: {
              id: url.split('/').pop(),
              title: 'Rebalanced',
              list: 'l-1',
              position: JSON.parse(init.body).position,
              assignees: [],
            },
          },
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    const result = await useBoardStore.getState().moveCard('c-3', 'l-1', 'l-1', 1);

    expect(result.success).toBe(true);
    expect(patchCalls).toHaveLength(3);
    expect(useBoardStore.getState().cardsByList['l-1'].map((c) => c.position)).toEqual([
      1000,
      2000,
      3000,
    ]);
  });

  it('preserves unsaved card title edits in TaskDetailsDrawer when switching lists before Save Changes', async () => {
    const user = userEvent.setup();
    setStoredToken('jwt-token');
    useBoardStore.setState({
      activeBoard: { id: 'b-1', name: 'Board' },
      lists: [
        { id: 'l-1', name: 'To Do', board: 'b-1', position: 1000 },
        { id: 'l-2', name: 'Doing', board: 'b-1', position: 2000 },
      ],
      cardsByList: {
        'l-1': [{ id: 'c-1', title: 'Initial Title', list: 'l-1', position: 1000, priority: 'medium', assignees: [] }],
        'l-2': [],
      },
    });
    useUIStore.setState({ selectedCardId: 'c-1' });

    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/cards/c-1/move' && init.method === 'PATCH') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            card: { id: 'c-1', title: 'Initial Title', list: 'l-2', position: 1000, priority: 'medium', assignees: [] },
          },
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    render(<TaskDetailsDrawer />);
    const titleInput = screen.getByLabelText(/card title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Edited Before Move');
    await user.selectOptions(screen.getByLabelText(/^list$/i), 'l-2');

    await waitFor(() => {
      expect(useBoardStore.getState().cardsByList['l-2']).toHaveLength(1);
    });
    expect(screen.getByLabelText(/card title/i)).toHaveValue('Edited Before Move');
  });
});
