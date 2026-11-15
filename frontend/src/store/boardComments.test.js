import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBoardStore } from './useBoardStore';
import { commentService } from '../services/commentService';

vi.mock('../services/commentService', () => ({
  commentService: {
    listComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

describe('useBoardStore — Card Comments State & Real-Time Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBoardStore.getState().resetBoardState();
  });

  it('fetchComments loads comments for active card and sets state', async () => {
    const mockComments = [
      { id: 'c1', card: 'card-1', content: 'First message', author: { name: 'Alice' } },
      { id: 'c2', card: 'card-1', content: 'Second message', author: { name: 'Bob' } },
    ];
    commentService.listComments.mockResolvedValueOnce(mockComments);

    const promise = useBoardStore.getState().fetchComments('card-1');
    expect(useBoardStore.getState().isLoadingComments).toBe(true);
    expect(useBoardStore.getState().activeCommentCardId).toBe('card-1');

    const result = await promise;
    expect(result).toEqual(mockComments);
    expect(useBoardStore.getState().comments).toEqual(mockComments);
    expect(useBoardStore.getState().isLoadingComments).toBe(false);
    expect(useBoardStore.getState().commentsError).toBeNull();
  });

  it('prevents late responses from an old card from overwriting active card comments', async () => {
    let resolveCardA;
    const cardAPromise = new Promise((resolve) => {
      resolveCardA = resolve;
    });

    commentService.listComments
      .mockImplementationOnce(() => cardAPromise)
      .mockResolvedValueOnce([{ id: 'c-b1', card: 'card-b', content: 'Card B Comment' }]);

    // User opens Card A
    useBoardStore.getState().fetchComments('card-a');
    expect(useBoardStore.getState().activeCommentCardId).toBe('card-a');

    // User switches to Card B
    await useBoardStore.getState().fetchComments('card-b');
    expect(useBoardStore.getState().activeCommentCardId).toBe('card-b');
    expect(useBoardStore.getState().comments).toEqual([
      { id: 'c-b1', card: 'card-b', content: 'Card B Comment' },
    ]);

    // Late response from Card A arrives
    resolveCardA([{ id: 'c-a1', card: 'card-a', content: 'Card A Late Comment' }]);
    await cardAPromise;

    // Must NOT overwrite Card B
    expect(useBoardStore.getState().activeCommentCardId).toBe('card-b');
    expect(useBoardStore.getState().comments).toEqual([
      { id: 'c-b1', card: 'card-b', content: 'Card B Comment' },
    ]);
  });

  it('createComment calls REST API and appends comment with deduplication', async () => {
    useBoardStore.setState({
      activeBoardId: 'board-1',
      activeCommentCardId: 'card-1',
      comments: [{ id: 'c1', content: 'Existing comment' }],
    });

    const newComment = { id: 'c2', content: 'Newly created comment' };
    commentService.createComment.mockResolvedValueOnce(newComment);

    const res = await useBoardStore.getState().createComment('card-1', 'Newly created comment');
    expect(res.success).toBe(true);
    expect(useBoardStore.getState().comments).toEqual([
      { id: 'c1', content: 'Existing comment' },
      { id: 'c2', content: 'Newly created comment' },
    ]);

    // Attempting to add same comment again does not duplicate
    await useBoardStore.getState().createComment('card-1', 'Newly created comment');
    expect(useBoardStore.getState().comments).toHaveLength(2);
  });

  it('deleteComment removes comment from store', async () => {
    useBoardStore.setState({
      activeBoardId: 'board-1',
      activeCommentCardId: 'card-1',
      comments: [
        { id: 'c1', content: 'To keep' },
        { id: 'c2', content: 'To delete' },
      ],
    });

    commentService.deleteComment.mockResolvedValueOnce(null);

    const res = await useBoardStore.getState().deleteComment('card-1', 'c2');
    expect(res.success).toBe(true);
    expect(useBoardStore.getState().comments).toEqual([{ id: 'c1', content: 'To keep' }]);
  });

  it('applySocketCommentCreated appends comment for active card & board and deduplicates', () => {
    useBoardStore.setState({
      activeBoardId: 'board-1',
      activeCommentCardId: 'card-1',
      comments: [{ id: 'c1', content: 'First' }],
    });

    // 1. Valid event for active card on active board
    useBoardStore.getState().applySocketCommentCreated({
      boardId: 'board-1',
      cardId: 'card-1',
      comment: { id: 'c2', card: 'card-1', board: 'board-1', content: 'Second via socket' },
    });
    expect(useBoardStore.getState().comments).toHaveLength(2);

    // 2. Duplicate event (same comment ID) is ignored
    useBoardStore.getState().applySocketCommentCreated({
      boardId: 'board-1',
      cardId: 'card-1',
      comment: { id: 'c2', card: 'card-1', board: 'board-1', content: 'Second via socket' },
    });
    expect(useBoardStore.getState().comments).toHaveLength(2);

    // 3. Event for different card is ignored
    useBoardStore.getState().applySocketCommentCreated({
      boardId: 'board-1',
      cardId: 'card-other',
      comment: { id: 'c3', card: 'card-other', board: 'board-1', content: 'Different card' },
    });
    expect(useBoardStore.getState().comments).toHaveLength(2);

    // 4. Event for different board is ignored
    useBoardStore.getState().applySocketCommentCreated({
      boardId: 'board-other',
      cardId: 'card-1',
      comment: { id: 'c4', card: 'card-1', board: 'board-other', content: 'Different board' },
    });
    expect(useBoardStore.getState().comments).toHaveLength(2);
  });

  it('applySocketCommentDeleted removes comment for active card and board', () => {
    useBoardStore.setState({
      activeBoardId: 'board-1',
      activeCommentCardId: 'card-1',
      comments: [
        { id: 'c1', content: 'Comment 1' },
        { id: 'c2', content: 'Comment 2' },
      ],
    });

    // Event for different board is ignored
    useBoardStore.getState().applySocketCommentDeleted({
      boardId: 'board-2',
      cardId: 'card-1',
      commentId: 'c1',
    });
    expect(useBoardStore.getState().comments).toHaveLength(2);

    // Event for different card is ignored
    useBoardStore.getState().applySocketCommentDeleted({
      boardId: 'board-1',
      cardId: 'card-2',
      commentId: 'c1',
    });
    expect(useBoardStore.getState().comments).toHaveLength(2);

    // Event for matching card and board deletes the comment
    useBoardStore.getState().applySocketCommentDeleted({
      boardId: 'board-1',
      cardId: 'card-1',
      commentId: 'c1',
    });
    expect(useBoardStore.getState().comments).toEqual([{ id: 'c2', content: 'Comment 2' }]);
  });

  it('clearComments and setActiveBoardId reset comments state cleanly', () => {
    useBoardStore.setState({
      activeBoardId: 'board-1',
      activeCommentCardId: 'card-1',
      comments: [{ id: 'c1', content: 'Comment' }],
      isLoadingComments: true,
      commentsError: 'Some error',
    });

    useBoardStore.getState().clearComments();
    expect(useBoardStore.getState().comments).toEqual([]);
    expect(useBoardStore.getState().activeCommentCardId).toBeNull();
    expect(useBoardStore.getState().isLoadingComments).toBe(false);
    expect(useBoardStore.getState().commentsError).toBeNull();
  });
});
