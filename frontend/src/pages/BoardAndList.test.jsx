import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BoardsPage } from './ProjectsPage';
import { BoardCreateModal } from '../components/boards/BoardCreateModal';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { ToastContainer } from '../components/common/ToastContainer';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useBoardStore } from '../store/useBoardStore';
import { useUIStore } from '../store/useUIStore';
import { setStoredToken } from '../services/apiClient';

const mockJsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'application/json' },
  json: async () => body,
});

describe('Dynamic Board & List Management Flows', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    setStoredToken('jwt-token');
    useAuthStore.setState({
      user: { id: 'user-owner', name: 'Alice Owner', email: 'alice@example.com' },
      token: 'jwt-token',
      isAuthenticated: true,
      isHydrating: false,
    });
    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Core Team', role: 'owner' }],
      activeWorkspaceId: 'ws-1',
      activeWorkspaceDetails: { id: 'ws-1', name: 'Core Team', role: 'owner' },
      members: [{ id: 'user-owner', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' }],
      users: [{ id: 'user-owner', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' }],
      hasLoadedWorkspaces: true,
    });
    useBoardStore.getState().resetBoardState();
    useUIStore.setState({
      isCreateBoardOpen: false,
      editingBoard: null,
      toasts: [],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('creates a new board via BoardCreateModal and activates it', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/workspaces/ws-1/boards' && init.method === 'POST') {
        const body = JSON.parse(init.body);
        return mockJsonResponse(201, {
          success: true,
          data: {
            board: {
              id: 'board-new',
              name: body.name,
              description: body.description,
              workspace: 'ws-1',
              createdBy: 'user-owner',
            },
          },
        });
      }
      if (url === '/api/boards/board-new') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            board: {
              id: 'board-new',
              name: 'Product Roadmap',
              description: 'Q4 milestones',
              createdBy: { id: 'user-owner', name: 'Alice Owner' },
            },
          },
        });
      }
      if (url === '/api/boards/board-new/lists') {
        return mockJsonResponse(200, { success: true, data: { lists: [] } });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    render(
      <MemoryRouter>
        <BoardsPage />
        <BoardCreateModal />
        <ToastContainer />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /create board/i }));
    await user.type(screen.getByLabelText(/board name/i), 'Product Roadmap');
    await user.type(screen.getByLabelText(/description/i), 'Q4 milestones');
    await user.click(screen.getAllByRole('button', { name: /create board/i }).pop());

    await waitFor(() => {
      expect(useBoardStore.getState().activeBoardId).toBe('board-new');
      expect(screen.getByText('Product Roadmap')).toBeInTheDocument();
    });
  });

  it('deletes a board with ConfirmDialog and enforces creator/admin RBAC in BoardsPage', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/boards/board-1' && init.method === 'DELETE') {
        return mockJsonResponse(200, { success: true, data: null });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    useBoardStore.setState({
      boards: [
        {
          id: 'board-1',
          name: 'Platform Sprint',
          description: 'Core tasks',
          createdBy: 'user-owner',
        },
      ],
      activeBoardId: 'board-1',
    });

    render(
      <MemoryRouter>
        <BoardsPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /delete platform sprint/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /delete board/i }));

    await waitFor(() => {
      expect(screen.queryByText('Platform Sprint')).not.toBeInTheDocument();
    });
  });

  it('creates, renames, reorders with rollback on error, and deletes dynamic lists on KanbanBoard', async () => {
    const user = userEvent.setup();
    let failNextMove = true;

    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/boards/b-1/lists' && init.method === 'POST') {
        const body = JSON.parse(init.body);
        return mockJsonResponse(201, {
          success: true,
          data: {
            list: {
              id: 'list-3',
              name: body.name,
              board: 'b-1',
              position: 3000,
            },
          },
        });
      }
      if (url === '/api/lists/list-1' && init.method === 'PATCH') {
        const body = JSON.parse(init.body);
        if (body.position !== undefined && failNextMove) {
          failNextMove = false;
          return mockJsonResponse(500, {
            success: false,
            message: 'Simulated move persistence failure',
          });
        }
        return mockJsonResponse(200, {
          success: true,
          data: {
            list: {
              id: 'list-1',
              name: body.name || 'Inbox',
              board: 'b-1',
              position: body.position ?? 1000,
            },
          },
        });
      }
      if (url === '/api/lists/list-3' && init.method === 'DELETE') {
        return mockJsonResponse(200, { success: true, data: null });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    useBoardStore.setState({
      boards: [{ id: 'b-1', name: 'Delivery Board', description: '', createdBy: 'user-owner' }],
      activeBoardId: 'b-1',
      activeBoard: { id: 'b-1', name: 'Delivery Board', description: '', createdBy: 'user-owner' },
      lists: [
        { id: 'list-1', name: 'To Do', board: 'b-1', position: 1000 },
        { id: 'list-2', name: 'Done', board: 'b-1', position: 2000 },
      ],
      cardsByList: { 'list-1': [], 'list-2': [] },
    });

    render(
      <MemoryRouter>
        <KanbanBoard />
        <ToastContainer />
      </MemoryRouter>
    );

    // 1. Add dynamic list
    await user.click(screen.getByRole('button', { name: /add list/i }));
    await user.type(screen.getByLabelText(/new list name/i), 'Blocked');
    await user.click(screen.getByRole('button', { name: /^add list$/i }));
    expect(await screen.findByText('Blocked')).toBeInTheDocument();

    // 2. Rename list-1 inline
    await user.click(screen.getByRole('button', { name: /rename to do/i }));
    const renameInput = screen.getByLabelText(/rename list to do/i);
    await user.clear(renameInput);
    await user.type(renameInput, 'Inbox');
    await user.click(screen.getByRole('button', { name: /save list name/i }));
    expect(await screen.findByText('Inbox')).toBeInTheDocument();

    // 3. Reorder list-1 right fails -> verifies optimistic rollback preserves list order
    await user.click(screen.getByRole('button', { name: /move inbox right/i }));
    await waitFor(() => {
      expect(screen.getByText('Unable to reorder list')).toBeInTheDocument();
      expect(useBoardStore.getState().lists.map((l) => l.name)).toEqual([
        'Inbox',
        'Done',
        'Blocked',
      ]);
    });

    // 4. Reorder list-1 right succeeds
    await user.click(screen.getByRole('button', { name: /move inbox right/i }));
    await waitFor(() => {
      expect(useBoardStore.getState().lists.map((l) => l.name)).toEqual([
        'Done',
        'Inbox',
        'Blocked',
      ]);
    });

    // 5. Delete list-3 via ConfirmDialog
    await user.click(screen.getByRole('button', { name: /delete blocked/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /delete list/i }));
    await waitFor(() => {
      expect(screen.queryByText('Blocked')).not.toBeInTheDocument();
    });
  });
});
