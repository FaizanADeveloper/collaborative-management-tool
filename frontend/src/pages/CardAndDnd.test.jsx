import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { TaskCreateModal } from '../components/tasks/TaskCreateModal';
import { TaskDetailsDrawer } from '../components/tasks/TaskDetailsDrawer';
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

describe('Card CRUD, Filters & Persistent Drag-and-Drop Rollback', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    setStoredToken('jwt-token');
    useAuthStore.setState({
      user: { id: 'u-1', name: 'Alice Owner', email: 'alice@example.com' },
      token: 'jwt-token',
      isAuthenticated: true,
      isHydrating: false,
    });
    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Core Team', role: 'owner' }],
      activeWorkspaceId: 'ws-1',
      activeWorkspaceDetails: { id: 'ws-1', name: 'Core Team', role: 'owner' },
      members: [
        { id: 'u-1', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
        { id: 'u-2', name: 'Bob Member', email: 'bob@example.com', role: 'member' },
      ],
      users: [
        { id: 'u-1', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
        { id: 'u-2', name: 'Bob Member', email: 'bob@example.com', role: 'member' },
      ],
      hasLoadedWorkspaces: true,
    });
    useBoardStore.getState().resetBoardState();
    useBoardStore.setState({
      boards: [{ id: 'b-1', name: 'Sprint Board', description: '', createdBy: 'u-1' }],
      activeBoardId: 'b-1',
      activeBoard: { id: 'b-1', name: 'Sprint Board', description: '', createdBy: 'u-1' },
      lists: [
        { id: 'l-1', name: 'To Do', board: 'b-1', position: 1000 },
        { id: 'l-2', name: 'In Progress', board: 'b-1', position: 2000 },
      ],
      cardsByList: {
        'l-1': [
          {
            id: 'c-1',
            title: 'Write auth tests',
            description: 'Cover login & refresh',
            list: 'l-1',
            board: 'b-1',
            position: 1000,
            priority: 'high',
            labels: ['QA'],
            assignees: [{ id: 'u-1', name: 'Alice Owner', email: 'alice@example.com' }],
            dueDate: '2026-11-25T00:00:00.000Z',
          },
        ],
        'l-2': [
          {
            id: 'c-2',
            title: 'Build navbar',
            description: '',
            list: 'l-2',
            board: 'b-1',
            position: 1000,
            priority: 'low',
            labels: ['UI'],
            assignees: [],
          },
        ],
      },
    });
    useUIStore.setState({
      isCreateCardOpen: false,
      defaultListId: null,
      selectedCardId: null,
      toasts: [],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('creates a card inside targeted list with defaultListId synced and normalizes string assignee IDs', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/lists/l-2/cards' && init.method === 'POST') {
        const body = JSON.parse(init.body);
        return mockJsonResponse(201, {
          success: true,
          data: {
            card: {
              id: 'c-new',
              title: body.title,
              description: body.description,
              list: 'l-2',
              board: 'b-1',
              position: 2000,
              priority: body.priority,
              assignees: body.assignees, // unpopulated string IDs matching backend createCard
              labels: body.labels,
              dueDate: body.dueDate,
            },
          },
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    render(
      <MemoryRouter>
        <KanbanBoard />
        <TaskCreateModal />
        <ToastContainer />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /add card to in progress/i }));
    expect(screen.getByLabelText(/^list/i)).toHaveValue('l-2');

    await user.type(screen.getByLabelText(/card title/i), 'Wire API webhooks');
    await user.selectOptions(screen.getByLabelText(/^priority/i), 'urgent');
    await user.click(screen.getByRole('button', { name: /bob member/i }));
    await user.type(screen.getByPlaceholderText(/add label/i), 'Backend');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    await user.click(screen.getAllByRole('button', { name: /create card/i }).pop());

    expect(await screen.findByText('Wire API webhooks')).toBeInTheDocument();
    const saved = useBoardStore.getState().cardsByList['l-2'].find((c) => c.id === 'c-new');
    expect(saved.assignees[0]).toMatchObject({ id: 'u-2', name: 'Bob Member' });
  });

  it('edits card fields, moves between lists, filters cards, and deletes via ConfirmDialog', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/cards/c-1' && init.method === 'PATCH') {
        const body = JSON.parse(init.body);
        return mockJsonResponse(200, {
          success: true,
          data: {
            card: {
              id: 'c-1',
              title: body.title,
              description: body.description,
              list: 'l-1',
              board: 'b-1',
              position: 1000,
              priority: body.priority,
              labels: body.labels,
              assignees: [],
              dueDate: body.dueDate,
            },
          },
        });
      }
      if (url === '/api/cards/c-1/move' && init.method === 'PATCH') {
        const body = JSON.parse(init.body);
        return mockJsonResponse(200, {
          success: true,
          data: {
            card: {
              id: 'c-1',
              title: 'Write auth + e2e tests',
              list: body.destinationListId,
              board: 'b-1',
              position: body.position,
              priority: 'urgent',
              labels: ['QA'],
              assignees: [],
            },
          },
        });
      }
      if (url === '/api/cards/c-1' && init.method === 'DELETE') {
        return mockJsonResponse(200, { success: true, data: null });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    render(
      <MemoryRouter>
        <KanbanBoard />
        <TaskDetailsDrawer />
        <ToastContainer />
      </MemoryRouter>
    );

    // Filter search narrows cards cleanly
    const searchInput = screen.getByLabelText(/filter cards/i);
    await user.type(searchInput, 'auth');
    expect(screen.getByText('Write auth tests')).toBeInTheDocument();
    expect(screen.queryByText('Build navbar')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset filters/i }));
    expect(screen.getByText('Build navbar')).toBeInTheDocument();

    // Open card drawer
    await user.click(screen.getByText('Write auth tests'));
    const titleInput = screen.getByLabelText(/card title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Write auth + e2e tests');
    await user.selectOptions(screen.getByLabelText(/^priority$/i), 'urgent');
    await user.clear(screen.getByLabelText(/due date/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Write auth + e2e tests')).toBeInTheDocument();
    });

    // Move to l-2
    await user.selectOptions(screen.getByLabelText(/^list$/i), 'l-2');
    await waitFor(() => {
      expect(useBoardStore.getState().cardsByList['l-2'].some((c) => c.id === 'c-1')).toBe(true);
    });

    // Delete via ConfirmDialog
    await user.click(screen.getAllByRole('button', { name: /^delete card$/i })[0]);
    const confirmButtons = screen.getAllByRole('button', { name: /^delete card$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText('Write auth + e2e tests')).not.toBeInTheDocument();
    });
  });

  it('persists optimistic card move via PATCH /api/cards/:id/move with midpoint math and rolls back on failure', async () => {
    let movePayload = null;
    useBoardStore.setState({
      cardsByList: {
        'l-1': [
          { id: 'c-1', title: 'First', list: 'l-1', position: 1000, assignees: [] },
        ],
        'l-2': [
          { id: 'c-2', title: 'Second', list: 'l-2', position: 1000, assignees: [] },
          { id: 'c-3', title: 'Third', list: 'l-2', position: 2000, assignees: [] },
        ],
      },
    });

    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/cards/c-1/move' && init.method === 'PATCH') {
        movePayload = JSON.parse(init.body);
        if (movePayload.destinationListId === 'l-2' && movePayload.position === 1500) {
          return mockJsonResponse(200, {
            success: true,
            data: {
              card: { id: 'c-1', title: 'First', list: 'l-2', position: 1500, assignees: [] },
            },
          });
        }
        return mockJsonResponse(500, {
          success: false,
          message: 'Database write error',
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    // Successful cross-list move at index 1 computes exact midpoint 1500
    const okResult = await useBoardStore.getState().moveCard('c-1', 'l-1', 'l-2', 1);
    expect(okResult.success).toBe(true);
    expect(movePayload).toEqual({ destinationListId: 'l-2', position: 1500 });
    expect(useBoardStore.getState().cardsByList['l-2'].map((c) => c.id)).toEqual([
      'c-2',
      'c-1',
      'c-3',
    ]);

    // Failed move back to l-1 rolls back cleanly to exact pre-failure order
    const failResult = await useBoardStore.getState().moveCard('c-1', 'l-2', 'l-1', 0);
    expect(failResult.success).toBe(false);
    expect(failResult.error).toBe('Database write error');
    expect(useBoardStore.getState().cardsByList['l-1']).toEqual([]);
    expect(useBoardStore.getState().cardsByList['l-2'].map((c) => c.id)).toEqual([
      'c-2',
      'c-1',
      'c-3',
    ]);
  });
});
