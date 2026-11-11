import { apiClient } from './apiClient';

export const workspaceService = {
  async listWorkspaces() {
    const response = await apiClient.get('/workspaces');
    return Array.isArray(response?.data?.workspaces) ? response.data.workspaces : [];
  },

  async createWorkspace({ name, description = '' }) {
    const response = await apiClient.post('/workspaces', { name, description });
    return response?.data?.workspace || null;
  },

  async getWorkspace(id) {
    const response = await apiClient.get(`/workspaces/${id}`);
    return response?.data?.workspace || null;
  },

  async getWorkspaceMembers(id) {
    const response = await apiClient.get(`/workspaces/${id}/members`);
    return Array.isArray(response?.data?.members) ? response.data.members : [];
  },

  async updateWorkspace(id, { name, description }) {
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    const response = await apiClient.put(`/workspaces/${id}`, payload);
    return response?.data?.workspace || null;
  },

  async deleteWorkspace(id) {
    await apiClient.delete(`/workspaces/${id}`);
    return null;
  },

  async generateInviteCode(id) {
    const response = await apiClient.post(`/workspaces/${id}/invite`);
    return response?.data?.inviteCode || null;
  },

  async joinWorkspace(inviteCode) {
    const code = encodeURIComponent(String(inviteCode || '').trim());
    const response = await apiClient.post(`/workspaces/join/${code}`);
    return response?.data?.workspace || null;
  },

  async removeMember(workspaceId, userId) {
    await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
    return null;
  },
};
