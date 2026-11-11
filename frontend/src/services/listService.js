import { apiClient } from './apiClient';

export const listService = {
  async listLists(boardId) {
    const response = await apiClient.get(`/boards/${boardId}/lists`);
    return Array.isArray(response?.data?.lists) ? response.data.lists : [];
  },

  async createList(boardId, { name, position }) {
    const payload = { name };
    if (position !== undefined) payload.position = position;
    const response = await apiClient.post(`/boards/${boardId}/lists`, payload);
    return response?.data?.list || null;
  },

  async updateList(listId, { name, position }) {
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (position !== undefined) payload.position = position;
    const response = await apiClient.patch(`/lists/${listId}`, payload);
    return response?.data?.list || null;
  },

  async deleteList(listId) {
    await apiClient.delete(`/lists/${listId}`);
    return null;
  },
};
