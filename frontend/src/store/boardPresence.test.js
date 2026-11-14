import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore } from './useBoardStore';

describe('Phase 3C: Frontend Zustand Board Presence Management', () => {
  beforeEach(() => {
    useBoardStore.getState().resetBoardState();
  });

  it('populates initial active collaborator snapshot for active board and ignores other boards', () => {
    useBoardStore.setState({ activeBoardId: 'board-alpha' });

    // Events for a different board are ignored
    useBoardStore.getState().setCollaborators('board-beta', [
      { id: 'user-foreign', name: 'Foreign User', avatar: '' },
    ]);
    expect(useBoardStore.getState().activeCollaborators).toEqual([]);

    // Snapshot for active board is set and deduplicated
    useBoardStore.getState().setCollaborators('board-alpha', [
      { id: 'user-1', name: 'Alice', avatar: 'https://example.com/alice.png' },
      { id: 'user-2', name: 'Bob', avatar: '' },
      { id: 'user-1', name: 'Alice Duplicate', avatar: '' }, // duplicate ID
    ]);

    expect(useBoardStore.getState().activeCollaborators).toEqual([
      { id: 'user-1', name: 'Alice', avatar: 'https://example.com/alice.png', email: '' },
      { id: 'user-2', name: 'Bob', avatar: '', email: '' },
    ]);
  });

  it('handles applySocketUserJoined: appends new collaborator and updates existing without duplication', () => {
    useBoardStore.setState({
      activeBoardId: 'board-alpha',
      activeCollaborators: [{ id: 'user-1', name: 'Alice', avatar: '', email: '' }],
    });

    // Ignored for different board
    useBoardStore.getState().applySocketUserJoined({
      boardId: 'board-beta',
      user: { id: 'user-3', name: 'Charlie' },
    });
    expect(useBoardStore.getState().activeCollaborators).toHaveLength(1);

    // Appends new collaborator
    useBoardStore.getState().applySocketUserJoined({
      boardId: 'board-alpha',
      user: { id: 'user-2', name: 'Bob', avatar: 'https://example.com/bob.png' },
    });
    expect(useBoardStore.getState().activeCollaborators).toHaveLength(2);
    expect(useBoardStore.getState().activeCollaborators[1].id).toBe('user-2');

    // Updates existing collaborator without creating duplicate
    useBoardStore.getState().applySocketUserJoined({
      boardId: 'board-alpha',
      user: { id: 'user-1', name: 'Alice Updated', avatar: 'https://example.com/new-alice.png' },
    });
    expect(useBoardStore.getState().activeCollaborators).toHaveLength(2);
    expect(useBoardStore.getState().activeCollaborators[0]).toEqual({
      id: 'user-1',
      name: 'Alice Updated',
      avatar: 'https://example.com/new-alice.png',
      email: '',
    });
  });

  it('handles applySocketUserLeft: removes collaborator safely and handles duplicate leaves idempotently', () => {
    useBoardStore.setState({
      activeBoardId: 'board-alpha',
      activeCollaborators: [
        { id: 'user-1', name: 'Alice', avatar: '', email: '' },
        { id: 'user-2', name: 'Bob', avatar: '', email: '' },
      ],
    });

    // Ignored for different board
    useBoardStore.getState().applySocketUserLeft({
      boardId: 'board-beta',
      userId: 'user-1',
    });
    expect(useBoardStore.getState().activeCollaborators).toHaveLength(2);

    // Removes target user
    useBoardStore.getState().applySocketUserLeft({
      boardId: 'board-alpha',
      userId: 'user-1',
    });
    expect(useBoardStore.getState().activeCollaborators).toEqual([
      { id: 'user-2', name: 'Bob', avatar: '', email: '' },
    ]);

    // Duplicate leave is harmless
    useBoardStore.getState().applySocketUserLeft({
      boardId: 'board-alpha',
      userId: 'user-1',
    });
    expect(useBoardStore.getState().activeCollaborators).toEqual([
      { id: 'user-2', name: 'Bob', avatar: '', email: '' },
    ]);
  });

  it('clears activeCollaborators on board switch, workspace change, and state reset', () => {
    useBoardStore.setState({
      activeBoardId: 'board-alpha',
      activeCollaborators: [{ id: 'user-1', name: 'Alice', avatar: '', email: '' }],
    });

    // Switching board clears previous presence
    useBoardStore.getState().setActiveBoardId('board-gamma');
    expect(useBoardStore.getState().activeCollaborators).toEqual([]);

    // Re-populate
    useBoardStore.setState({
      activeBoardId: 'board-gamma',
      activeCollaborators: [{ id: 'user-2', name: 'Bob', avatar: '', email: '' }],
    });

    // Changing workspace clears presence
    useBoardStore.getState().clearForWorkspaceChange();
    expect(useBoardStore.getState().activeCollaborators).toEqual([]);

    // Re-populate
    useBoardStore.setState({
      activeBoardId: 'board-delta',
      activeCollaborators: [{ id: 'user-3', name: 'Charlie', avatar: '', email: '' }],
    });

    // resetBoardState clears presence
    useBoardStore.getState().resetBoardState();
    expect(useBoardStore.getState().activeCollaborators).toEqual([]);
  });
});
