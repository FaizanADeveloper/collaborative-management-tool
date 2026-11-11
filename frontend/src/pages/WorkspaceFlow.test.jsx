import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TeamPage } from './TeamPage';
import { SettingsPage } from './SettingsPage';
import { WorkspaceCreateModal } from '../components/workspaces/WorkspaceCreateModal';
import { JoinWorkspaceModal } from '../components/workspaces/JoinWorkspaceModal';
import { Sidebar } from '../components/layout/Sidebar';
import { ToastContainer } from '../components/common/ToastContainer';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUIStore } from '../store/useUIStore';
import { setStoredToken } from '../services/apiClient';

const mockJsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'application/json' },
  json: async () => body,
});

describe('Workspace & Membership Management Flows', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    setStoredToken('jwt-token');
    useAuthStore.setState({
      user: {
        id: 'user-owner',
        name: 'Alice Owner',
        email: 'alice@example.com',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      token: 'jwt-token',
      isAuthenticated: true,
      isHydrating: false,
      authError: null,
    });
    useWorkspaceStore.getState().resetWorkspaceState();
    useUIStore.setState({
      isCreateWorkspaceOpen: false,
      isJoinWorkspaceOpen: false,
      toasts: [],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('creates a new workspace through WorkspaceCreateModal and activates it', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/workspaces' && init.method === 'POST') {
        const parsed = JSON.parse(init.body);
        return mockJsonResponse(201, {
          success: true,
          data: {
            workspace: {
              id: 'ws-new',
              name: parsed.name,
              description: parsed.description,
              inviteCode: 'INV12345',
              role: 'owner',
            },
          },
        });
      }
      if (url === '/api/workspaces/ws-new') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            workspace: {
              id: 'ws-new',
              name: 'Design Systems',
              description: 'Component library squad',
              inviteCode: 'INV12345',
              role: 'owner',
            },
          },
        });
      }
      if (url === '/api/workspaces/ws-new/members') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            members: [
              {
                id: 'user-owner',
                name: 'Alice Owner',
                email: 'alice@example.com',
                role: 'owner',
                joinedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    useUIStore.getState().openCreateWorkspace();

    render(
      <>
        <WorkspaceCreateModal />
        <ToastContainer />
      </>
    );

    await user.type(screen.getByLabelText(/workspace name/i), 'Design Systems');
    await user.type(screen.getByLabelText(/description/i), 'Component library squad');
    await user.click(screen.getByRole('button', { name: /create workspace/i }));

    await waitFor(() => {
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-new');
      expect(useWorkspaceStore.getState().members).toHaveLength(1);
    });
  });

  it('joins an existing workspace by invite code and surfaces invalid code errors', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/api/workspaces/join/BADCODE') {
        return mockJsonResponse(404, {
          success: false,
          message: 'Invalid invitation code. Workspace not found.',
        });
      }
      if (url === '/api/workspaces/join/TEAM99') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            workspace: {
              id: 'ws-joined',
              name: 'Product Org',
              description: 'Shared product team',
              role: 'member',
            },
          },
        });
      }
      if (url === '/api/workspaces/ws-joined') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            workspace: {
              id: 'ws-joined',
              name: 'Product Org',
              description: 'Shared product team',
              role: 'member',
            },
          },
        });
      }
      if (url === '/api/workspaces/ws-joined/members') {
        return mockJsonResponse(200, {
          success: true,
          data: { members: [] },
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    useUIStore.getState().openJoinWorkspace();

    render(<JoinWorkspaceModal />);

    const input = screen.getByLabelText(/invitation code/i);
    await user.type(input, 'BADCODE');
    await user.click(screen.getByRole('button', { name: /join workspace/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid invitation code. Workspace not found.'
    );

    await user.clear(input);
    await user.type(input, 'TEAM99');
    await user.click(screen.getByRole('button', { name: /join workspace/i }));

    await waitFor(() => {
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-joined');
      expect(useUIStore.getState().isJoinWorkspaceOpen).toBe(false);
    });
  });

  it('switches active workspace from Sidebar and loads updated context', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url) => {
      if (url === '/api/workspaces/ws-2') {
        return mockJsonResponse(200, {
          success: true,
          data: { workspace: { id: 'ws-2', name: 'Beta Lab', role: 'admin' } },
        });
      }
      if (url === '/api/workspaces/ws-2/members') {
        return mockJsonResponse(200, {
          success: true,
          data: {
            members: [
              { id: 'user-owner', name: 'Alice Owner', email: 'alice@example.com', role: 'admin' },
            ],
          },
        });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-1', name: 'Alpha Team', role: 'owner' },
        { id: 'ws-2', name: 'Beta Lab', role: 'admin' },
      ],
      activeWorkspaceId: 'ws-1',
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /alpha team/i }));
    await user.click(screen.getByRole('menuitem', { name: /beta lab/i }));

    await waitFor(() => {
      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-2');
      expect(useWorkspaceStore.getState().activeWorkspaceDetails?.name).toBe('Beta Lab');
    });
  });

  it('enforces owner RBAC on TeamPage: regenerate invite code and remove member with ConfirmDialog', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      if (url === '/api/workspaces/ws-1/invite' && init.method === 'POST') {
        return mockJsonResponse(200, {
          success: true,
          data: { inviteCode: 'NEWCODE88' },
        });
      }
      if (url === '/api/workspaces/ws-1/members/user-member' && init.method === 'DELETE') {
        return mockJsonResponse(200, { success: true, data: null });
      }
      return mockJsonResponse(404, { success: false, message: 'Not found' });
    });

    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Alpha Team', role: 'owner', inviteCode: 'OLDCODE1' }],
      activeWorkspaceId: 'ws-1',
      activeWorkspaceDetails: {
        id: 'ws-1',
        name: 'Alpha Team',
        role: 'owner',
        inviteCode: 'OLDCODE1',
      },
      members: [
        { id: 'user-owner', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
        { id: 'user-member', name: 'Bob Member', email: 'bob@example.com', role: 'member' },
      ],
      hasLoadedWorkspaces: true,
    });

    render(<TeamPage />);

    expect(screen.getByText('OLDCODE1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /regenerate/i }));
    expect(await screen.findByText('NEWCODE88')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove member/i }));

    await waitFor(() => {
      expect(screen.queryByText('Bob Member')).not.toBeInTheDocument();
    });
  });

  it('restricts plain members from invite management & workspace deletion in TeamPage and SettingsPage', async () => {
    useAuthStore.setState({
      user: { id: 'user-member', name: 'Bob Member', email: 'bob@example.com' },
      isAuthenticated: true,
    });
    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Alpha Team', role: 'member' }],
      activeWorkspaceId: 'ws-1',
      activeWorkspaceDetails: { id: 'ws-1', name: 'Alpha Team', role: 'member' },
      members: [
        { id: 'user-owner', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
        { id: 'user-member', name: 'Bob Member', email: 'bob@example.com', role: 'member' },
      ],
      hasLoadedWorkspaces: true,
    });

    const { rerender } = render(<TeamPage />);
    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave workspace/i })).toBeInTheDocument();

    rerender(<SettingsPage />);
    expect(screen.queryByRole('button', { name: /delete workspace/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/workspace name/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /leave workspace/i })).toBeInTheDocument();
  });
});
