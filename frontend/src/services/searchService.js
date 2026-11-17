import { apiClient } from './apiClient';

/**
 * Service for querying workspace full-text search API
 */
export const searchService = {
  /**
   * Search across workspace cards, boards, and lists
   *
   * @param {string} workspaceId - Target workspace ID
   * @param {object} params - Search query options
   * @param {string} params.q - Search query string
   * @param {'all'|'cards'|'boards'|'lists'} [params.type='all'] - Entity type filter
   * @param {number} [params.limit=20] - Maximum results
   * @param {number} [params.page=1] - 1-based page index
   * @param {string} [params.boardId] - Optional board ID to narrow scope
   * @param {object} [options] - Additional request options
   * @param {AbortSignal} [options.signal] - Abort signal for request cancellation
   * @returns {Promise<object>} Standardized search payload { query, total, page, limit, totalPages, counts, results }
   */
  async searchWorkspace(workspaceId, { q, type = 'all', limit = 20, page = 1, boardId } = {}, { signal } = {}) {
    if (!workspaceId) {
      throw new Error('Workspace ID is required for search');
    }
    if (!q || !q.trim()) {
      return {
        query: '',
        total: 0,
        page,
        limit,
        totalPages: 1,
        counts: { cards: 0, boards: 0, lists: 0 },
        results: [],
      };
    }

    const queryParams = new URLSearchParams();
    queryParams.set('q', q.trim());
    if (type && type !== 'all') {
      queryParams.set('type', type);
    }
    if (limit) {
      queryParams.set('limit', String(limit));
    }
    if (page && page > 1) {
      queryParams.set('page', String(page));
    }
    if (boardId) {
      queryParams.set('boardId', String(boardId));
    }

    const path = `/workspaces/${workspaceId}/search?${queryParams.toString()}`;
    const response = await apiClient.get(path, { signal });

    return response?.data || {
      query: q.trim(),
      total: 0,
      page,
      limit,
      totalPages: 1,
      counts: { cards: 0, boards: 0, lists: 0 },
      results: [],
    };
  },
};
