import { apiClient } from './apiClient';

export const commentService = {
  /**
   * Fetch all comments for a card in chronological order
   *
   * @param {string} cardId
   * @returns {Promise<Array<object>>}
   */
  async listComments(cardId) {
    const response = await apiClient.get(`/cards/${cardId}/comments`);
    return Array.isArray(response?.data?.comments) ? response.data.comments : [];
  },

  /**
   * Create a new comment on a card
   *
   * @param {string} cardId
   * @param {{ content: string }} payload
   * @returns {Promise<object|null>}
   */
  async createComment(cardId, { content }) {
    const response = await apiClient.post(`/cards/${cardId}/comments`, { content });
    return response?.data?.comment || null;
  },

  /**
   * Delete a comment from a card
   *
   * @param {string} cardId
   * @param {string} commentId
   * @returns {Promise<null>}
   */
  async deleteComment(cardId, commentId) {
    await apiClient.delete(`/cards/${cardId}/comments/${commentId}`);
    return null;
  },
};
