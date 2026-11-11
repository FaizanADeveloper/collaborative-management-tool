import { apiClient } from './apiClient';

export const cardService = {
  async listCards(listId) {
    const response = await apiClient.get(`/lists/${listId}/cards`);
    return Array.isArray(response?.data?.cards) ? response.data.cards : [];
  },

  async createCard(listId, payload) {
    const response = await apiClient.post(`/lists/${listId}/cards`, payload);
    return response?.data?.card || null;
  },

  async getCard(cardId) {
    const response = await apiClient.get(`/cards/${cardId}`);
    return response?.data?.card || null;
  },

  async updateCard(cardId, payload) {
    const response = await apiClient.patch(`/cards/${cardId}`, payload);
    return response?.data?.card || null;
  },

  async deleteCard(cardId) {
    await apiClient.delete(`/cards/${cardId}`);
    return null;
  },

  async moveCard(cardId, { destinationListId, position }) {
    const response = await apiClient.patch(`/cards/${cardId}/move`, {
      destinationListId,
      position,
    });
    return response?.data?.card || null;
  },
};
