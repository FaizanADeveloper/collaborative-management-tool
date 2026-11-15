import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commentService } from './commentService';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('commentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listComments calls GET /cards/:cardId/comments and returns array', async () => {
    const mockComments = [
      { id: 'c1', content: 'First comment' },
      { id: 'c2', content: 'Second comment' },
    ];
    apiClient.get.mockResolvedValueOnce({
      success: true,
      data: { comments: mockComments },
    });

    const result = await commentService.listComments('card-123');

    expect(apiClient.get).toHaveBeenCalledWith('/cards/card-123/comments');
    expect(result).toEqual(mockComments);
  });

  it('listComments returns empty array if response format is unexpected', async () => {
    apiClient.get.mockResolvedValueOnce({});
    const result = await commentService.listComments('card-123');
    expect(result).toEqual([]);
  });

  it('createComment calls POST /cards/:cardId/comments with content', async () => {
    const mockComment = { id: 'c3', content: 'New comment' };
    apiClient.post.mockResolvedValueOnce({
      success: true,
      data: { comment: mockComment },
    });

    const result = await commentService.createComment('card-123', { content: 'New comment' });

    expect(apiClient.post).toHaveBeenCalledWith('/cards/card-123/comments', { content: 'New comment' });
    expect(result).toEqual(mockComment);
  });

  it('deleteComment calls DELETE /cards/:cardId/comments/:commentId', async () => {
    apiClient.delete.mockResolvedValueOnce({ success: true, data: null });

    const result = await commentService.deleteComment('card-123', 'c-999');

    expect(apiClient.delete).toHaveBeenCalledWith('/cards/card-123/comments/c-999');
    expect(result).toBeNull();
  });
});
