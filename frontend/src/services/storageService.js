import {
  initialUsers,
  initialWorkspaces,
  initialProjects,
  initialTasks,
  initialActivities,
  initialNotifications
} from './mockData';

const STORAGE_KEYS = {
  USER: 'syncflow_current_user',
  WORKSPACES: 'syncflow_workspaces',
  PROJECTS: 'syncflow_projects',
  TASKS: 'syncflow_tasks',
  ACTIVITIES: 'syncflow_activities',
  NOTIFICATIONS: 'syncflow_notifications',
  ACTIVE_WORKSPACE_ID: 'syncflow_active_ws_id',
  THEME: 'syncflow_theme',
};

export const storage = {
  get(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`Failed reading ${key} from localStorage:`, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed writing ${key} to localStorage:`, e);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed removing ${key} from localStorage:`, e);
    }
  },

  initStorage() {
    if (!this.get(STORAGE_KEYS.TASKS, null)) {
      this.set(STORAGE_KEYS.TASKS, initialTasks);
    }
    if (!this.get(STORAGE_KEYS.PROJECTS, null)) {
      this.set(STORAGE_KEYS.PROJECTS, initialProjects);
    }
    if (!this.get(STORAGE_KEYS.WORKSPACES, null)) {
      this.set(STORAGE_KEYS.WORKSPACES, initialWorkspaces);
    }
    if (!this.get(STORAGE_KEYS.ACTIVITIES, null)) {
      this.set(STORAGE_KEYS.ACTIVITIES, initialActivities);
    }
    if (!this.get(STORAGE_KEYS.NOTIFICATIONS, null)) {
      this.set(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    }
    if (!this.get(STORAGE_KEYS.USER, null)) {
      this.set(STORAGE_KEYS.USER, initialUsers[0]);
    }
    if (!this.get(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, null)) {
      this.set(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, 'ws-2');
    }
  },

  resetToDefault() {
    this.set(STORAGE_KEYS.TASKS, initialTasks);
    this.set(STORAGE_KEYS.PROJECTS, initialProjects);
    this.set(STORAGE_KEYS.WORKSPACES, initialWorkspaces);
    this.set(STORAGE_KEYS.ACTIVITIES, initialActivities);
    this.set(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    this.set(STORAGE_KEYS.USER, initialUsers[0]);
    this.set(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, 'ws-2');
  }
};

export { STORAGE_KEYS };

