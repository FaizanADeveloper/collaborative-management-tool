import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import { registerLogoutCleanup } from './useAuthStore';

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasLoaded: false,
  error: null,
  isDropdownOpen: false,
};

export const useNotificationStore = create((set, get) => ({
  ...initialState,

  fetchNotifications: async (options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = await notificationService.listNotifications(options);
      set({
        notifications: Array.isArray(data.notifications) ? data.notifications : [],
        unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
        isLoading: false,
        hasLoaded: true,
      });
      return { success: true, data };
    } catch (err) {
      set({
        isLoading: false,
        error: err.message || 'Failed to load notifications',
      });
      return { success: false, error: err.message };
    }
  },

  fetchUnreadCount: async (workspaceId = null) => {
    try {
      const count = await notificationService.getUnreadCount(workspaceId);
      set({ unreadCount: count });
    } catch {
      // Ignore background count errors
    }
  },

  markAsRead: async (notificationId) => {
    if (!notificationId) return;

    const previousNotifications = get().notifications;
    const target = previousNotifications.find((n) => n.id === notificationId);
    const wasUnread = target && !target.isRead;

    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      await notificationService.markAsRead(notificationId);
    } catch {
      // Rollback on failure
      set({
        notifications: previousNotifications,
        unreadCount: get().unreadCount + (wasUnread ? 1 : 0),
      });
    }
  },

  markAllAsRead: async (workspaceId = null) => {
    const previousNotifications = get().notifications;
    const previousUnreadCount = get().unreadCount;

    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      })),
      unreadCount: 0,
    }));

    try {
      await notificationService.markAllAsRead(workspaceId);
    } catch {
      // Rollback on failure
      set({
        notifications: previousNotifications,
        unreadCount: previousUnreadCount,
      });
    }
  },

  deleteNotification: async (notificationId) => {
    if (!notificationId) return;

    const previousNotifications = get().notifications;
    const target = previousNotifications.find((n) => n.id === notificationId);
    const wasUnread = target && !target.isRead;

    // Optimistic delete
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      await notificationService.deleteNotification(notificationId);
    } catch {
      // Rollback on failure
      set({
        notifications: previousNotifications,
        unreadCount: get().unreadCount + (wasUnread ? 1 : 0),
      });
    }
  },

  applySocketNotification: (notification) => {
    if (!notification || !notification.id) return;

    set((state) => {
      // Deduplicate: avoid duplicate insertion if notification already exists
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
      };
    });
  },

  setDropdownOpen: (isOpen) => set({ isDropdownOpen: Boolean(isOpen) }),

  toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),

  clearStore: () => set({ ...initialState }),
}));

registerLogoutCleanup(() => {
  useNotificationStore.getState().clearStore();
});
