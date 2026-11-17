import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from './useNotificationStore';
import { notificationService } from '../services/notificationService';

vi.mock('../services/notificationService', () => ({
  notificationService: {
    listNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.getState().clearStore();
  });

  it('initializes with default empty state', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isLoading).toBe(false);
    expect(state.hasLoaded).toBe(false);
    expect(state.error).toBeNull();
    expect(state.isDropdownOpen).toBe(false);
  });

  it('fetchNotifications populates notifications and unreadCount', async () => {
    const mockData = {
      notifications: [
        { id: 'n1', title: 'Task assigned', isRead: false },
        { id: 'n2', title: 'Comment added', isRead: true },
      ],
      unreadCount: 1,
      total: 2,
    };
    notificationService.listNotifications.mockResolvedValueOnce(mockData);

    const promise = useNotificationStore.getState().fetchNotifications({ workspaceId: 'ws-1' });
    expect(useNotificationStore.getState().isLoading).toBe(true);

    const res = await promise;
    expect(res.success).toBe(true);
    expect(useNotificationStore.getState().notifications).toEqual(mockData.notifications);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(useNotificationStore.getState().isLoading).toBe(false);
    expect(useNotificationStore.getState().hasLoaded).toBe(true);
  });

  it('fetchNotifications handles service failure gracefully', async () => {
    notificationService.listNotifications.mockRejectedValueOnce(new Error('Network error'));

    const res = await useNotificationStore.getState().fetchNotifications();
    expect(res.success).toBe(false);
    expect(useNotificationStore.getState().isLoading).toBe(false);
    expect(useNotificationStore.getState().error).toBe('Network error');
  });

  it('fetchUnreadCount updates unreadCount', async () => {
    notificationService.getUnreadCount.mockResolvedValueOnce(5);

    await useNotificationStore.getState().fetchUnreadCount('ws-1');
    expect(useNotificationStore.getState().unreadCount).toBe(5);
  });

  it('markAsRead performs optimistic update and calls service', async () => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', title: 'Task assigned', isRead: false },
        { id: 'n2', title: 'Comment added', isRead: false },
      ],
      unreadCount: 2,
    });

    notificationService.markAsRead.mockResolvedValueOnce({ id: 'n1', isRead: true });

    await useNotificationStore.getState().markAsRead('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].isRead).toBe(true);
    expect(state.unreadCount).toBe(1);
    expect(notificationService.markAsRead).toHaveBeenCalledWith('n1');
  });

  it('markAsRead does not decrement unreadCount if already read', async () => {
    useNotificationStore.setState({
      notifications: [{ id: 'n1', title: 'Task assigned', isRead: true }],
      unreadCount: 0,
    });

    notificationService.markAsRead.mockResolvedValueOnce({ id: 'n1', isRead: true });

    await useNotificationStore.getState().markAsRead('n1');

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
  });

  it('markAsRead rolls back state when service call fails', async () => {
    const originalNotifications = [
      { id: 'n1', title: 'Task assigned', isRead: false },
    ];
    useNotificationStore.setState({
      notifications: originalNotifications,
      unreadCount: 1,
    });

    notificationService.markAsRead.mockRejectedValueOnce(new Error('Update failed'));

    await useNotificationStore.getState().markAsRead('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].isRead).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it('markAllAsRead marks all notifications as read and resets unreadCount', async () => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', isRead: false },
        { id: 'n2', isRead: false },
      ],
      unreadCount: 2,
    });

    notificationService.markAllAsRead.mockResolvedValueOnce({ modifiedCount: 2 });

    await useNotificationStore.getState().markAllAsRead('ws-1');

    const state = useNotificationStore.getState();
    expect(state.notifications.every((n) => n.isRead)).toBe(true);
    expect(state.unreadCount).toBe(0);
    expect(notificationService.markAllAsRead).toHaveBeenCalledWith('ws-1');
  });

  it('markAllAsRead rolls back state when service call fails', async () => {
    const initialList = [
      { id: 'n1', isRead: false },
      { id: 'n2', isRead: false },
    ];
    useNotificationStore.setState({
      notifications: initialList,
      unreadCount: 2,
    });

    notificationService.markAllAsRead.mockRejectedValueOnce(new Error('Server error'));

    await useNotificationStore.getState().markAllAsRead('ws-1');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].isRead).toBe(false);
    expect(state.notifications[1].isRead).toBe(false);
    expect(state.unreadCount).toBe(2);
  });

  it('deleteNotification removes notification and decrements unreadCount optimistically', async () => {
    useNotificationStore.setState({
      notifications: [
        { id: 'n1', isRead: false },
        { id: 'n2', isRead: true },
      ],
      unreadCount: 1,
    });

    notificationService.deleteNotification.mockResolvedValueOnce(true);

    await useNotificationStore.getState().deleteNotification('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('n2');
    expect(state.unreadCount).toBe(0);
  });

  it('applySocketNotification prepends new notification and increments unread count', () => {
    useNotificationStore.setState({
      notifications: [{ id: 'n1', isRead: true }],
      unreadCount: 0,
    });

    const incoming = { id: 'n2', title: 'New assignment', isRead: false };
    useNotificationStore.getState().applySocketNotification(incoming);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(2);
    expect(state.notifications[0].id).toBe('n2');
    expect(state.unreadCount).toBe(1);
  });

  it('applySocketNotification deduplicates if notification already exists', () => {
    useNotificationStore.setState({
      notifications: [{ id: 'n1', isRead: false }],
      unreadCount: 1,
    });

    useNotificationStore.getState().applySocketNotification({ id: 'n1', isRead: false });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('toggles and sets dropdown open state', () => {
    expect(useNotificationStore.getState().isDropdownOpen).toBe(false);

    useNotificationStore.getState().toggleDropdown();
    expect(useNotificationStore.getState().isDropdownOpen).toBe(true);

    useNotificationStore.getState().setDropdownOpen(false);
    expect(useNotificationStore.getState().isDropdownOpen).toBe(false);
  });
});
