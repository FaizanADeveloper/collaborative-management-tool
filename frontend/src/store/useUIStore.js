import { create } from 'zustand';

const THEME_STORAGE_KEY = 'syncflow_theme';

const readSavedTheme = () => {
  try {
    const saved = window.localStorage?.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return 'dark';
};

const applyThemeClass = (theme) => {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const initialTheme = readSavedTheme();
applyThemeClass(initialTheme);

export const useUIStore = create((set, get) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  theme: initialTheme,
  setTheme: (theme) => {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    try {
      window.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage write errors
    }
    applyThemeClass(nextTheme);
    set({ theme: nextTheme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  isCommandPaletteOpen: false,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

  isCreateWorkspaceOpen: false,
  openCreateWorkspace: () => set({ isCreateWorkspaceOpen: true }),
  closeCreateWorkspace: () => set({ isCreateWorkspaceOpen: false }),

  isJoinWorkspaceOpen: false,
  openJoinWorkspace: () => set({ isJoinWorkspaceOpen: true }),
  closeJoinWorkspace: () => set({ isJoinWorkspaceOpen: false }),

  isCreateBoardOpen: false,
  openCreateBoard: () => set({ isCreateBoardOpen: true }),
  closeCreateBoard: () => set({ isCreateBoardOpen: false }),

  isCreateCardOpen: false,
  defaultListId: null,
  openCreateCard: (listId = null) =>
    set({ isCreateCardOpen: true, defaultListId: listId }),
  closeCreateCard: () => set({ isCreateCardOpen: false }),

  selectedCardId: null,
  openCardDetails: (cardId) => set({ selectedCardId: cardId }),
  closeCardDetails: () => set({ selectedCardId: null }),

  // Compatibility aliases while migrating legacy mock modals/pages across milestones
  isCreateTaskOpen: false,
  defaultTaskStatus: 'todo',
  openCreateTask: (defaultStatus = 'todo') =>
    set({ isCreateTaskOpen: true, defaultTaskStatus: defaultStatus }),
  closeCreateTask: () => set({ isCreateTaskOpen: false }),

  isCreateProjectOpen: false,
  openCreateProject: () => set({ isCreateProjectOpen: true }),
  closeCreateProject: () => set({ isCreateProjectOpen: false }),

  selectedTaskId: null,
  openTaskDetails: (taskId) => set({ selectedTaskId: taskId }),
  closeTaskDetails: () => set({ selectedTaskId: null }),

  toasts: [],
  addToast: ({ type = 'info', title, message, duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
