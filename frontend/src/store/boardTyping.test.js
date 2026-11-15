import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBoardStore } from './useBoardStore';
import { useAuthStore } from './useAuthStore';

describe('useBoardStore - Real-Time Card Typing State', () => {
  const currentUserId = 'user-current';
  const peer1 = { id: 'user-peer-1', name: 'Ada Lovelace', avatar: 'https://example.com/ada.png' };
  const peer2 = { id: 'user-peer-2', name: 'Charles Babbage', avatar: 'https://example.com/charles.png' };
  const boardId = 'board-123';
  const cardId = 'card-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: currentUserId, name: 'Current User', email: 'me@flowdesk.dev' },
      isAuthenticated: true,
    });

    useBoardStore.getState().resetBoardState();
    useBoardStore.setState({
      activeBoardId: boardId,
      activeBoard: { id: boardId, name: 'Active Board' },
    });
  });

  it('adds and updates typing collaborators when isTyping is true', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer1,
    });

    const typers = useBoardStore.getState().typingByCard[cardId] || [];
    expect(typers).toHaveLength(1);
    expect(typers[0]).toMatchObject({
      id: peer1.id,
      name: peer1.name,
      avatar: peer1.avatar,
    });
    expect(typeof typers[0].timestamp).toBe('number');
  });

  it('deduplicates multiple typing events from the same collaborator', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer1,
    });

    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer1,
    });

    const typers = useBoardStore.getState().typingByCard[cardId] || [];
    expect(typers).toHaveLength(1);
  });

  it('tracks multiple distinct collaborators on the same card', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer1,
    });

    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer2,
    });

    const typers = useBoardStore.getState().typingByCard[cardId] || [];
    expect(typers).toHaveLength(2);
    expect(typers.map((u) => u.name)).toEqual(['Ada Lovelace', 'Charles Babbage']);
  });

  it('removes a collaborator when isTyping is false', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer1,
    });
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer2,
    });

    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: false,
      user: peer1,
    });

    const typers = useBoardStore.getState().typingByCard[cardId] || [];
    expect(typers).toHaveLength(1);
    expect(typers[0].id).toBe(peer2.id);
  });

  it('ignores typing events belonging to a different board', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId: 'different-board',
      cardId,
      isTyping: true,
      user: peer1,
    });

    const typers = useBoardStore.getState().typingByCard[cardId] || [];
    expect(typers).toHaveLength(0);
  });

  it('ignores typing events originated from the current user', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: { id: currentUserId, name: 'Current User', avatar: '' },
    });

    const typers = useBoardStore.getState().typingByCard[cardId] || [];
    expect(typers).toHaveLength(0);
  });

  it('clearCardTyping clears typing state only for the targeted card', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId: 'card-1',
      isTyping: true,
      user: peer1,
    });
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId: 'card-2',
      isTyping: true,
      user: peer2,
    });

    useBoardStore.getState().clearCardTyping('card-1');

    expect(useBoardStore.getState().typingByCard['card-1']).toBeUndefined();
    expect(useBoardStore.getState().typingByCard['card-2']).toHaveLength(1);
  });

  it('clearAllTyping removes typing state across all cards', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId: 'card-1',
      isTyping: true,
      user: peer1,
    });
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId: 'card-2',
      isTyping: true,
      user: peer2,
    });

    useBoardStore.getState().clearAllTyping();

    expect(useBoardStore.getState().typingByCard).toEqual({});
  });

  it('getTypingCollaborators filters out entries older than 4 seconds', () => {
    const expiredTimestamp = Date.now() - 5000;
    const freshTimestamp = Date.now() - 500;

    useBoardStore.setState({
      typingByCard: {
        [cardId]: [
          { id: peer1.id, name: peer1.name, avatar: '', timestamp: expiredTimestamp },
          { id: peer2.id, name: peer2.name, avatar: '', timestamp: freshTimestamp },
        ],
      },
    });

    const active = useBoardStore.getState().getTypingCollaborators(cardId);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(peer2.id);
  });

  it('resets typing state when workspace changes or board is reset', () => {
    useBoardStore.getState().applySocketCardTyping({
      boardId,
      cardId,
      isTyping: true,
      user: peer1,
    });

    useBoardStore.getState().clearForWorkspaceChange();
    expect(useBoardStore.getState().typingByCard).toEqual({});
  });
});
