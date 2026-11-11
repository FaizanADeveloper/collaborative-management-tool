import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { CommandPalette } from '../components/layout/CommandPalette';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useBoardStore } from '../store/useBoardStore';
import { useUIStore } from '../store/useUIStore';

describe('DashboardPage & CommandPalette Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      user: { id: 'u-1', name: 'Alice Owner', email: 'alice@example.com' },
      isAuthenticated: true,
      isHydrating: false,
    });
    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'Engineering Core', role: 'owner' }],
      activeWorkspaceId: 'ws-1',
      activeWorkspaceDetails: { id: 'ws-1', name: 'Engineering Core', role: 'owner' },
      members: [
        { id: 'u-1', name: 'Alice Owner', email: 'alice@example.com', role: 'owner' },
        { id: 'u-2', name: 'Bob Member', email: 'bob@example.com', role: 'member' },
      ],
      isLoadingWorkspaces: false,
      hasLoadedWorkspaces: true,
    });
    useBoardStore.setState({
      boards: [
        { id: 'b-1', name: 'Core Platform', description: 'API & frontend', createdBy: 'u-1' },
        { id: 'b-2', name: 'Mobile App', description: 'iOS release', createdBy: 'u-2' },
      ],
      activeBoardId: 'b-1',
      activeBoard: { id: 'b-1', name: 'Core Platform', description: 'API & frontend', createdBy: 'u-1' },
      lists: [
        { id: 'l-1', name: 'Backlog', board: 'b-1', position: 1000 },
        { id: 'l-2', name: 'In Review', board: 'b-1', position: 2000 },
      ],
      cardsByList: {
        'l-1': [
          {
            id: 'c-1',
            title: 'Finalize API rate limits',
            description: 'Add Express middleware',
            priority: 'urgent',
            assignees: [{ id: 'u-1', name: 'Alice Owner' }],
            labels: ['Backend'],
          },
          {
            id: 'c-2',
            title: 'Audit CSS contrast tokens',
            description: '',
            priority: 'low',
            assignees: [{ id: 'u-2', name: 'Bob Member' }],
            labels: ['UI'],
          },
        ],
        'l-2': [
          {
            id: 'c-3',
            title: 'Deploy staging preview',
            description: '',
            priority: 'high',
            assignees: ['u-1'],
            labels: [],
          },
        ],
      },
    });
    useUIStore.setState({
      isCommandPaletteOpen: false,
      selectedCardId: null,
    });
  });

  it('renders real workspace, board, list, and assigned card analytics on DashboardPage', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/welcome back, alice/i)).toBeInTheDocument();
    expect(screen.getByText('Cards by List')).toBeInTheDocument();
    expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Assigned to You')).toBeInTheDocument();
    expect(screen.getAllByText('Workspace Boards')).toHaveLength(2);
    expect(screen.getByText('Mobile App')).toBeInTheDocument();

    // Verify user-assigned cards appear (including string assignee IDs) and unassigned member cards do not
    expect(screen.getByText('Finalize API rate limits')).toBeInTheDocument();
    expect(screen.getByText('Deploy staging preview')).toBeInTheDocument();
    expect(screen.queryByText('Audit CSS contrast tokens')).not.toBeInTheDocument();

    // Verify fake sprint widgets are completely absent
    expect(screen.queryByText(/Sprint 24/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Burndown/i)).not.toBeInTheDocument();

    await user.click(screen.getByText('Finalize API rate limits'));
    expect(useUIStore.getState().selectedCardId).toBe('c-1');
  });

  it('renders clean empty workspace onboarding on DashboardPage when user has no workspaces', () => {
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      activeWorkspaceDetails: null,
      members: [],
    });
    useBoardStore.getState().resetBoardState();

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText('You are not in a workspace yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /create workspace/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /join with invite code/i }).length).toBeGreaterThan(0);
  });

  it('opens CommandPalette via Ctrl+K, searches real cards/boards/members, and hides dead routes', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const searchInput = await screen.findByLabelText(/command palette search/i);

    expect(screen.queryByText(/backlog & sprints/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/activity feed/i)).not.toBeInTheDocument();

    await user.type(searchInput, 'rate limits');
    expect(screen.getByText('Finalize API rate limits')).toBeInTheDocument();

    await user.click(screen.getByText('Finalize API rate limits'));
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    expect(useUIStore.getState().selectedCardId).toBe('c-1');
  });
});
