import { apiClient } from './apiClient';

/**
 * Service for managing user in-app notifications
 */
export const notificationService = {
  /**
   * Retrieves paginated notifications for the current authenticated user
   *
   * @param {object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {boolean} [params.unreadOnly=false]
   * @param {string} [params.workspaceId]
   * @returns {Promise<object>} { notifications, total, unreadCount, page, limit, totalPages }
   */
  async listNotifications({ page = 1, limit = 20, unreadOnly = false, workspaceId } = {}) {
    const queryParams = new URLSearchParams();
    if (page && page > 1) queryParams.set('page', String(page));
    if (limit && limit !== 20) queryParams.set('limit', String(limit));
    if (unreadOnly) queryParams.set('unreadOnly', 'true');
    if (workspaceId) queryParams.set('workspaceId', String(workspaceId));

    const qs = queryParams.toString();
    const path = `/notifications${qs ? `?${qs}` : ''}`;
    const response = await apiClient.get(path);

    return (
      response?.data || {
        notifications: [],
        total: 0,
        unreadCount: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      }
    );
  },

  /**
   * Retrieves current unread notification count
   *
   * @param {string} [workspaceId]
   * @returns {Promise<number>} Unread notification count
   */
  async getUnreadCount(workspaceId) {
    const queryParams = new URLSearchParams();
    if (workspaceId) queryParams.set('workspaceId', String(workspaceId));
    const qs = queryParams.toString();
    const path = `/notifications/unread-count${qs ? `?${qs}` : ''}`;

    const response = await apiClient.get(path);
    return Number(response?.data?.count || 0);
  },

  /**
   * Marks a single notification as read
   *
   * @param {string} notificationId
   * @returns {Promise<object|null>}
   */
  async markAsRead(notificationId) {
    if (!notificationId) return null;
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response?.data?.notification || null;
  },

  /**
   * Marks all notifications as read for current user
   *
   * @param {string} [workspaceId]
   * @returns {Promise<{ modifiedCount: number }>}
   */
  async markAllAsRead(workspaceId) {
    const queryParams = new URLSearchParams();
    if (workspaceId) queryParams.set('workspaceId', String(workspaceId));
    const qs = queryParams.toString();
    const path = `/notifications/read-all${qs ? `?${qs}` : ''}`;

    const response = await apiClient.patch(path);
    return response?.data || { modifiedCount: 0 };
  },

  /**
   * Deletes a notification
   *
   * @param {string} notificationId
   * @returns {Promise<boolean>}
   */
  async deleteNotification(notificationId) {
    if (!notificationId) return false;
    await apiClient.delete(`/notifications/${notificationId}`);
    return true;
  },
};
