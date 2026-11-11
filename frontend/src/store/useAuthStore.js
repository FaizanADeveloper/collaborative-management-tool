import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '../services/storageService';
import { initialUsers } from '../services/mockData';

export const useAuthStore = create((set, get) => ({
  user: storage.get(STORAGE_KEYS.USER, initialUsers[0]),
  isAuthenticated: true,

  login: async (email, password) => {
    // Frontend mock simulation
    const matched = initialUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || {
      id: `user-${Date.now()}`,
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'Product Engineer',
      department: 'Engineering',
      status: 'online',
      initials: 'US',
      color: 'bg-indigo-600',
    };

    storage.set(STORAGE_KEYS.USER, matched);
    set({ user: matched, isAuthenticated: true });
    return { success: true };
  },

  signup: async (name, email, password) => {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      role: 'Full Stack Member',
      department: 'Product Development',
      status: 'online',
      initials: initials || 'ME',
      color: 'bg-indigo-600',
    };

    storage.set(STORAGE_KEYS.USER, newUser);
    set({ user: newUser, isAuthenticated: true });
    return { success: true };
  },

  logout: () => {
    storage.remove(STORAGE_KEYS.USER);
    set({ user: null, isAuthenticated: false });
  },

  updateProfile: (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    storage.set(STORAGE_KEYS.USER, updated);
    set({ user: updated });
  }
}));

