import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { initialNotifications } from '../services/mockData';

export const useNotificationStore = create((set, get) => ({
  notifications: storage.get(STORAGE_KEYS.NOTIFICATIONS, initialNotifications),

  markAsRead: (id) => {
    const updated = get().notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    set({ notifications: updated });
  },

  markAllAsRead: () => {
    const updated = get().notifications.map(n => ({ ...n, read: true }));
    storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    set({ notifications: updated });
  },

  clearAll: () => {
    storage.set(STORAGE_KEYS.NOTIFICATIONS, []);
    set({ notifications: [] });
  },

  pushNotification: (notif) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      time: 'Just now',
      read: false,
      avatar: null,
      ...notif
    };
    const updated = [newNotif, ...get().notifications];
    storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    set({ notifications: updated });
  }
}));

