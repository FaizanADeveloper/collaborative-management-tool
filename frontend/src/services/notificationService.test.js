import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from './notificationService';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists notifications with serialized query parameters', async () => {
    const mockPayload = {
      notifications: [{ id: 'n-1', title: 'Task alert' }],
      total: 1,
      unreadCount: 1,
    };
    apiClient.get.mockResolvedValueOnce({ data: mockPayload });

    const result = await notificationService.listNotifications({
      page: 2,
      limit: 10,
      unreadOnly: true,
      workspaceId: 'ws-456',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/notifications?page=2&limit=10&unreadOnly=true&workspaceId=ws-456'
    );
    expect(result).toEqual(mockPayload);
  });

  it('fetches unread count with optional workspaceId filter', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { count: 4 } });

    const count = await notificationService.getUnreadCount('ws-789');
    expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count?workspaceId=ws-789');
    expect(count).toBe(4);
  });

  it('marks a single notification as read', async () => {
    const updated = { id: 'n-1', isRead: true };
    apiClient.patch.mockResolvedValueOnce({ data: { notification: updated } });

    const result = await notificationService.markAsRead('n-1');
    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/n-1/read');
    expect(result).toEqual(updated);
  });

  it('marks all notifications as read', async () => {
    apiClient.patch.mockResolvedValueOnce({ data: { modifiedCount: 5 } });

    const result = await notificationService.markAllAsRead('ws-123');
    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all?workspaceId=ws-123');
    expect(result).toEqual({ modifiedCount: 5 });
  });

  it('deletes a notification', async () => {
    apiClient.delete.mockResolvedValueOnce({ success: true });

    const success = await notificationService.deleteNotification('n-del');
    expect(apiClient.delete).toHaveBeenCalledWith('/notifications/n-del');
    expect(success).toBe(true);
  });
});
