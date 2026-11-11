import { create } from 'zustand';
import {
  clearStoredToken,
  getStoredToken,
  registerUnauthorizedHandler,
  setStoredToken,
} from '../services/apiClient';
import { authService } from '../services/authService';

const logoutListeners = new Set();

export const registerLogoutCleanup = (fn) => {
  if (typeof fn === 'function') {
    logoutListeners.add(fn);
    return () => logoutListeners.delete(fn);
  }
  return () => {};
};

const notifyLogoutCleanup = () => {
  for (const listener of logoutListeners) {
    try {
      listener();
    } catch {
      // Ignore cleanup listener errors
    }
  }
};

const initialToken = getStoredToken();

export const useAuthStore = create((set, get) => ({
  user: null,
  token: initialToken,
  isAuthenticated: false,
  isHydrating: Boolean(initialToken),
  authError: null,

  hydrateAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isHydrating: false,
      });
      return null;
    }

    set({ isHydrating: true, authError: null });
    try {
      const user = await authService.getMe();
      set({
        user,
        token,
        isAuthenticated: true,
        isHydrating: false,
        authError: null,
      });
      return user;
    } catch {
      clearStoredToken();
      notifyLogoutCleanup();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isHydrating: false,
      });
      return null;
    }
  },

  login: async ({ email, password }) => {
    set({ authError: null });
    try {
      const data = await authService.login({ email, password });
      setStoredToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isHydrating: false,
        authError: null,
      });
      return { success: true, user: data.user };
    } catch (err) {
      set({ authError: err.message });
      return {
        success: false,
        error: err.message,
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  register: async ({ name, email, password, avatar }) => {
    set({ authError: null });
    try {
      const data = await authService.register({ name, email, password, avatar });
      setStoredToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isHydrating: false,
        authError: null,
      });
      return { success: true, user: data.user };
    } catch (err) {
      set({ authError: err.message });
      return {
        success: false,
        error: err.message,
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  logout: () => {
    clearStoredToken();
    notifyLogoutCleanup();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrating: false,
      authError: null,
    });
  },
}));

registerUnauthorizedHandler(() => {
  const { isAuthenticated, logout } = useAuthStore.getState();
  if (isAuthenticated) {
    logout();
  }
});
