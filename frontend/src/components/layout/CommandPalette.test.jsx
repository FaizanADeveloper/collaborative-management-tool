import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useBoardStore } from '../../store/useBoardStore';
import { searchService } from '../../services/searchService';

vi.mock('../../services/searchService', () => ({
  searchService: {
    searchWorkspace: vi.fn(),
  },
}));

describe('CommandPalette Full-Text Search Integration', () => {
  const mockWorkspaceId = 'ws-engineering';
  const mockActiveBoardId = 'board-alpha';

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      isCommandPaletteOpen: true,
      selectedCardId: null,
      isCardDetailsOpen: false,
    });

    useWorkspaceStore.setState({
      activeWorkspaceId: mockWorkspaceId,
      members: [
        { id: 'u-1', name: 'Grace Hopper', email: 'grace@example.com', role: 'admin' },
      ],
    });

    useBoardStore.setState({
      activeBoardId: mockActiveBoardId,
      boards: [
        { id: 'board-alpha', name: 'Alpha Core', description: 'Core system sprint' },
      ],
      lists: [
        { id: 'list-1', name: 'To Do', board: 'board-alpha' },
      ],
      cardsByList: {
        'list-1': [
          { id: 'card-local-1', title: 'Local Bugfix', description: 'Fix local issue', priority: 'medium' },
        ],
      },
    });
  });

  it('renders input and triggers debounced search request when user types', async () => {
    const user = userEvent.setup();
    searchService.searchWorkspace.mockResolvedValue({
      query: 'security',
      results: [
        {
          id: 'card-remote-99',
          type: 'card',
          title: 'Implement Zero Trust Tokens',
          description: 'Authenticate with sliding session',
          priority: 'urgent',
          board: { id: 'board-beta', name: 'Security Roadmap' },
          list: { id: 'list-sec', name: 'Review' },
        },
        {
          id: 'board-beta',
          type: 'board',
          name: 'Security Roadmap',
          description: 'Zero trust security board',
        },
        {
          id: 'list-sec',
          type: 'list',
          name: 'Review',
          board: { id: 'board-beta', name: 'Security Roadmap' },
        },
      ],
    });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/command palette search/i);
    expect(input).toBeInTheDocument();

    await user.type(input, 'security');

    // Wait for 250ms debounce and response
    await waitFor(() => {
      expect(searchService.searchWorkspace).toHaveBeenCalledWith(
        mockWorkspaceId,
        expect.objectContaining({ q: 'security' }),
        expect.any(Object)
      );
    });

    // Verify rendered results across cards, boards, and lists
    expect(await screen.findByText('Implement Zero Trust Tokens')).toBeInTheDocument();
    expect(screen.getByText('Security Roadmap • Review')).toBeInTheDocument();
    expect(screen.getByText('Security Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('handles cross-board navigation when selecting a card from another board', async () => {
    const user = userEvent.setup();
    const setActiveBoardIdSpy = vi.spyOn(useBoardStore.getState(), 'setActiveBoardId');

    searchService.searchWorkspace.mockResolvedValue({
      query: 'oauth',
      results: [
        {
          id: 'card-remote-42',
          type: 'card',
          title: 'OAuth2 Integration',
          priority: 'high',
          board: { id: 'board-foreign', name: 'External Integrations' },
          list: { id: 'list-foreign', name: 'Backlog' },
        },
      ],
    });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/command palette search/i);
    await user.type(input, 'oauth');

    const cardOption = await screen.findByText('OAuth2 Integration');
    await user.click(cardOption);

    // Command palette closes
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    // Board switches to target card's board
    expect(setActiveBoardIdSpy).toHaveBeenCalledWith('board-foreign');
    // Task details drawer opens for selected card
    expect(useUIStore.getState().selectedCardId).toBe('card-remote-42');
  });

  it('falls back gracefully to local cards and boards if remote search rejects', async () => {
    const user = userEvent.setup();
    searchService.searchWorkspace.mockRejectedValue(new Error('Network offline'));

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/command palette search/i);
    await user.type(input, 'Local Bugfix');

    // Local card matching fallback appears cleanly
    expect(await screen.findByText('Local Bugfix')).toBeInTheDocument();
  });

  it('clears query and resets search state when clicking the clear button', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/command palette search/i);
    await user.type(input, 'something');
    expect(input.value).toBe('something');

    const clearBtn = screen.getByLabelText(/clear search/i);
    await user.click(clearBtn);

    expect(input.value).toBe('');
  });

  it('supports keyboard navigation via ArrowDown and Enter key', async () => {
    const user = userEvent.setup();
    searchService.searchWorkspace.mockResolvedValue({
      query: 'board',
      results: [
        {
          id: 'board-1',
          type: 'board',
          name: 'First Board',
          description: 'Desc 1',
        },
        {
          id: 'board-2',
          type: 'board',
          name: 'Second Board',
          description: 'Desc 2',
        },
      ],
    });

    const setActiveBoardIdSpy = vi.spyOn(useBoardStore.getState(), 'setActiveBoardId');

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/command palette search/i);
    await user.type(input, 'board');

    await waitFor(() => {
      expect(screen.getByText('First Board')).toBeInTheDocument();
    });

    // Arrow down to select second item
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    expect(setActiveBoardIdSpy).toHaveBeenCalledWith('board-2');
  });
});
