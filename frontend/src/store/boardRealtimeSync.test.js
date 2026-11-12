import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore } from './useBoardStore';
import { useWorkspaceStore } from './useWorkspaceStore';

describe('Phase 3B: Frontend Zustand Board Real-Time Synchronization', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      members: [
        { id: 'user-1', name: 'Alex Morgan', email: 'alex@flowdesk.dev', avatar: '' },
      ],
    });

    useBoardStore.getState().resetBoardState();
    useBoardStore.setState({
      activeBoardId: 'board-1',
      activeBoard: { id: 'board-1', name: 'Sprint Board', workspace: 'ws-1' },
      lists: [
        { id: 'list-1', name: 'To Do', board: 'board-1', position: 1000 },
        { id: 'list-2', name: 'In Progress', board: 'board-1', position: 2000 },
      ],
      cardsByList: {
        'list-1': [
          {
            id: 'card-1',
            title: 'Existing Task',
            list: 'list-1',
            board: 'board-1',
            position: 1000,
            priority: 'medium',
            assignees: [],
            updatedAt: '2026-11-12T10:00:00.000Z',
          },
        ],
        'list-2': [],
      },
    });
  });

  it('adds incoming created cards, normalizes assignees, and ignores duplicate delivery', () => {
    const newCard = {
      id: 'card-2',
      title: 'Realtime Created Task',
      list: 'list-1',
      board: 'board-1',
      position: 500,
      priority: 'high',
      assignees: ['user-1'],
      updatedAt: '2026-11-12T10:05:00.000Z',
    };

    const payload = { boardId: 'board-1', listId: 'list-1', card: newCard };

    useBoardStore.getState().applySocketCardCreated(payload);
    // Duplicate delivery
    useBoardStore.getState().applySocketCardCreated(payload);

    const listCards = useBoardStore.getState().cardsByList['list-1'];
    expect(listCards).toHaveLength(2);
    // Sorted by position ascending (500 before 1000)
    expect(listCards.map((c) => c.id)).toEqual(['card-2', 'card-1']);
    expect(listCards[0].assignees).toEqual([
      { id: 'user-1', name: 'Alex Morgan', email: 'alex@flowdesk.dev', avatar: '' },
    ]);
  });

  it('updates card fields for newer timestamps and prevents stale updates from overwriting newer state', () => {
    useBoardStore.getState().applySocketCardUpdated({
      boardId: 'board-1',
      listId: 'list-1',
      card: {
        id: 'card-1',
        title: 'Updated Remote Title',
        list: 'list-1',
        board: 'board-1',
        position: 1000,
        priority: 'urgent',
        assignees: [],
        updatedAt: '2026-11-12T10:10:00.000Z',
      },
    });

    expect(useBoardStore.getState().cardsByList['list-1'][0]).toMatchObject({
      title: 'Updated Remote Title',
      priority: 'urgent',
    });

    // Stale event with older timestamp must not revert newer state
    useBoardStore.getState().applySocketCardUpdated({
      boardId: 'board-1',
      listId: 'list-1',
      card: {
        id: 'card-1',
        title: 'Outdated Title',
        list: 'list-1',
        board: 'board-1',
        position: 1000,
        priority: 'low',
        assignees: [],
        updatedAt: '2026-11-12T10:02:00.000Z',
      },
    });

    expect(useBoardStore.getState().cardsByList['list-1'][0].title).toBe('Updated Remote Title');
  });

  it('moves cards across lists cleanly and respects position ordering', () => {
    useBoardStore.getState().applySocketCardCreated({
      boardId: 'board-1',
      listId: 'list-2',
      card: {
        id: 'card-dest',
        title: 'Existing Dest Card',
        list: 'list-2',
        board: 'board-1',
        position: 2000,
        updatedAt: '2026-11-12T10:01:00.000Z',
      },
    });

    useBoardStore.getState().applySocketCardMoved({
      boardId: 'board-1',
      fromListId: 'list-1',
      toListId: 'list-2',
      card: {
        id: 'card-1',
        title: 'Existing Task',
        list: 'list-2',
        board: 'board-1',
        position: 1000,
        updatedAt: '2026-11-12T10:06:00.000Z',
      },
    });

    // Repeat duplicate move delivery
    useBoardStore.getState().applySocketCardMoved({
      boardId: 'board-1',
      fromListId: 'list-1',
      toListId: 'list-2',
      card: {
        id: 'card-1',
        title: 'Existing Task',
        list: 'list-2',
        board: 'board-1',
        position: 1000,
        updatedAt: '2026-11-12T10:06:00.000Z',
      },
    });

    expect(useBoardStore.getState().cardsByList['list-1']).toEqual([]);
    expect(useBoardStore.getState().cardsByList['list-2'].map((c) => c.id)).toEqual([
      'card-1',
      'card-dest',
    ]);
  });

  it('deletes cards idempotently and refuses resurrection from stale create/update events', () => {
    useBoardStore.getState().applySocketCardDeleted({
      boardId: 'board-1',
      listId: 'list-1',
      cardId: 'card-1',
    });

    expect(useBoardStore.getState().cardsByList['list-1']).toEqual([]);

    // Repeated delete & late stale update must safely no-op
    useBoardStore.getState().applySocketCardDeleted({
      boardId: 'board-1',
      listId: 'list-1',
      cardId: 'card-1',
    });
    useBoardStore.getState().applySocketCardUpdated({
      boardId: 'board-1',
      listId: 'list-1',
      card: {
        id: 'card-1',
        title: 'Ghost Card',
        list: 'list-1',
        board: 'board-1',
        position: 1000,
        updatedAt: '2026-11-12T10:09:00.000Z',
      },
    });

    expect(useBoardStore.getState().cardsByList['list-1']).toEqual([]);
  });

  it('ignores incoming socket events belonging to a different or inactive board', () => {
    useBoardStore.getState().applySocketCardCreated({
      boardId: 'board-other',
      listId: 'list-1',
      card: {
        id: 'foreign-card',
        title: 'Should Not Leak',
        list: 'list-1',
        board: 'board-other',
        position: 500,
      },
    });

    expect(useBoardStore.getState().cardsByList['list-1']).toHaveLength(1);

    useBoardStore.getState().setActiveBoardId(null);
    useBoardStore.getState().applySocketCardCreated({
      boardId: 'board-1',
      listId: 'list-1',
      card: {
        id: 'inactive-board-card',
        title: 'Ignored',
        list: 'list-1',
        board: 'board-1',
        position: 500,
      },
    });

    expect(useBoardStore.getState().cardsByList['list-1']).toBeUndefined();
  });

  it('synchronizes list creation, updates, and deletion for the active board', () => {
    useBoardStore.getState().applySocketListCreated({
      boardId: 'board-1',
      list: {
        id: 'list-3',
        name: 'Done',
        board: 'board-1',
        position: 3000,
        updatedAt: '2026-11-12T10:05:00.000Z',
      },
    });
    expect(useBoardStore.getState().lists.map((l) => l.id)).toEqual([
      'list-1',
      'list-2',
      'list-3',
    ]);

    useBoardStore.getState().applySocketListUpdated({
      boardId: 'board-1',
      list: {
        id: 'list-3',
        name: 'Shipped',
        board: 'board-1',
        position: 1500,
        updatedAt: '2026-11-12T10:06:00.000Z',
      },
    });
    expect(useBoardStore.getState().lists.map((l) => l.id)).toEqual([
      'list-1',
      'list-3',
      'list-2',
    ]);
    expect(useBoardStore.getState().lists[1].name).toBe('Shipped');

    useBoardStore.getState().applySocketListDeleted({
      boardId: 'board-1',
      listId: 'list-3',
    });
    expect(useBoardStore.getState().lists.map((l) => l.id)).toEqual(['list-1', 'list-2']);
  });
});
