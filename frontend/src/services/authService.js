import { apiClient } from './apiClient';

export const authService = {
  async register({ name, email, password, avatar }) {
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      ...(avatar && avatar.trim() ? { avatar: avatar.trim() } : {}),
    };
    const response = await apiClient.post('/auth/register', payload, { skipAuth: true });
    return response.data;
  },

  async login({ email, password }) {
    const payload = {
      email: email.trim().toLowerCase(),
      password,
    };
    const response = await apiClient.post('/auth/login', payload, { skipAuth: true });
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data.user;
  },

  async checkHealth() {
    return apiClient.get('/health', { skipAuth: true });
  },
};
