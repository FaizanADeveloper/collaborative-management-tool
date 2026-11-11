import { apiClient } from './apiClient';

export const boardService = {
  async listBoards(workspaceId) {
    const response = await apiClient.get(`/workspaces/${workspaceId}/boards`);
    return Array.isArray(response?.data?.boards) ? response.data.boards : [];
  },

  async createBoard(workspaceId, { name, description = '' }) {
    const response = await apiClient.post(`/workspaces/${workspaceId}/boards`, {
      name,
      description,
    });
    return response?.data?.board || null;
  },

  async getBoard(boardId) {
    const response = await apiClient.get(`/boards/${boardId}`);
    return response?.data?.board || null;
  },

  async updateBoard(boardId, { name, description }) {
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    const response = await apiClient.put(`/boards/${boardId}`, payload);
    return response?.data?.board || null;
  },

  async deleteBoard(boardId) {
    await apiClient.delete(`/boards/${boardId}`);
    return null;
  },
};
