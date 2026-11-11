import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '../services/storageService';

const getInitialTheme = () => {
  const saved = storage.get(STORAGE_KEYS.THEME, null);
  if (saved) return saved;
  return 'dark'; // Dark theme default for Linear-like aesthetic
};

export const useUIStore = create((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),

  theme: getInitialTheme(),
  setTheme: (theme) => {
    storage.set(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  isCommandPaletteOpen: false,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

  isCreateTaskOpen: false,
  openCreateTask: (defaultStatus = 'todo') => set({ isCreateTaskOpen: true, defaultTaskStatus: defaultStatus }),
  closeCreateTask: () => set({ isCreateTaskOpen: false }),
  defaultTaskStatus: 'todo',

  isCreateProjectOpen: false,
  openCreateProject: () => set({ isCreateProjectOpen: true }),
  closeCreateProject: () => set({ isCreateProjectOpen: false }),

  selectedTaskId: null,
  openTaskDetails: (taskId) => set({ selectedTaskId: taskId }),
  closeTaskDetails: () => set({ selectedTaskId: null }),

  liveSocketConnected: true,
  pingLatency: 14,
  simulatePing: () => {
    const lat = Math.floor(12 + Math.random() * 8);
    set({ pingLatency: lat });
  }
}));

