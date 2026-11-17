import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchService } from './searchService';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('searchService', () => {
  const workspaceId = 'ws-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error if workspaceId is missing', async () => {
    await expect(searchService.searchWorkspace('', { q: 'auth' })).rejects.toThrow(
      'Workspace ID is required for search'
    );
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('returns empty results immediately if query is empty or whitespace', async () => {
    const result = await searchService.searchWorkspace(workspaceId, { q: '   ' });
    expect(result).toEqual({
      query: '',
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      counts: { cards: 0, boards: 0, lists: 0 },
      results: [],
    });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('calls apiClient.get with correctly serialized query parameters', async () => {
    const mockData = {
      query: 'token',
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      counts: { cards: 1, boards: 0, lists: 0 },
      results: [{ id: 'card-1', type: 'card', title: 'Refresh Token' }],
    };

    apiClient.get.mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const result = await searchService.searchWorkspace(workspaceId, {
      q: 'token',
      type: 'cards',
      limit: 10,
      page: 1,
      boardId: 'board-456',
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    const [calledPath] = apiClient.get.mock.calls[0];
    expect(calledPath).toBe(
      '/workspaces/ws-123/search?q=token&type=cards&limit=10&boardId=board-456'
    );
    expect(result).toEqual(mockData);
  });

  it('passes abort signal to apiClient.get for request cancellation', async () => {
    const controller = new AbortController();
    apiClient.get.mockResolvedValueOnce({
      success: true,
      data: { results: [] },
    });

    await searchService.searchWorkspace(
      workspaceId,
      { q: 'security' },
      { signal: controller.signal }
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      '/workspaces/ws-123/search?q=security&limit=20',
      { signal: controller.signal }
    );
  });

  it('propagates errors when apiClient fails', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      searchService.searchWorkspace(workspaceId, { q: 'broken' })
    ).rejects.toThrow('Network error');
  });
});
