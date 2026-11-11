import { create } from 'zustand';
import { workspaceService } from '../services/workspaceService';
import { registerLogoutCleanup } from './useAuthStore';

const ACTIVE_WORKSPACE_KEY = 'syncflow_active_workspace_id';

const readSavedWorkspaceId = () => {
  try {
    return window.localStorage?.getItem(ACTIVE_WORKSPACE_KEY) || null;
  } catch {
    return null;
  }
};

const writeSavedWorkspaceId = (id) => {
  try {
    if (id) {
      window.localStorage?.setItem(ACTIVE_WORKSPACE_KEY, id);
    } else {
      window.localStorage?.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  } catch {
    // Ignore storage write errors in restricted environments
  }
};

let contextRequestCounter = 0;

const initialTransitionalState = {
  // Transitional empty collections until Milestones 5-7 migrate Board/List/Card views to useBoardStore
  projects: [],
  activeProjectId: null,
  tasks: [],
  activities: [],
  filters: {
    search: '',
    priority: 'all',
    assigneeId: 'all',
    tag: 'all',
    sortBy: 'default',
  },
};

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId: readSavedWorkspaceId(),
  activeWorkspaceDetails: null,
  members: [],
  users: [],
  isLoadingWorkspaces: false,
  isLoadingMembers: false,
  hasLoadedWorkspaces: false,
  workspaceError: null,

  ...initialTransitionalState,

  fetchWorkspaces: async () => {
    set({ isLoadingWorkspaces: true, workspaceError: null });
    try {
      const workspaces = await workspaceService.listWorkspaces();
      const currentActiveId = get().activeWorkspaceId;
      const matched = workspaces.find((ws) => ws.id === currentActiveId);
      const nextActiveId = matched ? matched.id : workspaces[0]?.id || null;

      writeSavedWorkspaceId(nextActiveId);
      set({
        workspaces,
        activeWorkspaceId: nextActiveId,
        isLoadingWorkspaces: false,
        hasLoadedWorkspaces: true,
        workspaceError: null,
      });

      if (nextActiveId) {
        await get().fetchWorkspaceContext(nextActiveId);
      } else {
        set({
          activeWorkspaceDetails: null,
          members: [],
          users: [],
          isLoadingMembers: false,
        });
      }

      return workspaces;
    } catch (err) {
      set({
        isLoadingWorkspaces: false,
        hasLoadedWorkspaces: true,
        workspaceError: err.message || 'Failed to load workspaces',
      });
      return [];
    }
  },

  fetchWorkspaceContext: async (workspaceId) => {
    if (!workspaceId) {
      set({
        activeWorkspaceDetails: null,
        members: [],
        users: [],
        isLoadingMembers: false,
      });
      return null;
    }

    const requestId = ++contextRequestCounter;
    set({ isLoadingMembers: true, workspaceError: null });
    try {
      const [details, members] = await Promise.all([
        workspaceService.getWorkspace(workspaceId),
        workspaceService.getWorkspaceMembers(workspaceId),
      ]);

      if (requestId !== contextRequestCounter) {
        return null;
      }

      set((state) => ({
        activeWorkspaceDetails: details,
        members,
        users: members,
        isLoadingMembers: false,
        workspaces: details
          ? state.workspaces.map((ws) =>
              ws.id === details.id ? { ...ws, ...details } : ws
            )
          : state.workspaces,
      }));

      return { details, members };
    } catch (err) {
      if (requestId !== contextRequestCounter) {
        return null;
      }
      set({
        isLoadingMembers: false,
        workspaceError: err.message || 'Failed to load workspace details',
      });
      return null;
    }
  },

  setActiveWorkspaceId: async (id) => {
    if (!id) {
      writeSavedWorkspaceId(null);
      set({
        activeWorkspaceId: null,
        activeWorkspaceDetails: null,
        members: [],
        users: [],
      });
      return;
    }

    writeSavedWorkspaceId(id);
    set({ activeWorkspaceId: id });
    await get().fetchWorkspaceContext(id);
  },

  createWorkspace: async ({ name, description }) => {
    try {
      const workspace = await workspaceService.createWorkspace({ name, description });
      if (!workspace) {
        return { success: false, error: 'Failed to create workspace', fieldErrors: {} };
      }

      writeSavedWorkspaceId(workspace.id);
      set((state) => ({
        workspaces: [workspace, ...state.workspaces.filter((w) => w.id !== workspace.id)],
        activeWorkspaceId: workspace.id,
        activeWorkspaceDetails: workspace,
        hasLoadedWorkspaces: true,
        workspaceError: null,
      }));

      await get().fetchWorkspaceContext(workspace.id);
      return { success: true, workspace };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to create workspace',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  updateWorkspace: async (id, { name, description }) => {
    try {
      const updated = await workspaceService.updateWorkspace(id, { name, description });
      if (!updated) {
        return { success: false, error: 'Failed to update workspace', fieldErrors: {} };
      }

      set((state) => ({
        workspaces: state.workspaces.map((ws) =>
          ws.id === id ? { ...ws, ...updated } : ws
        ),
        activeWorkspaceDetails:
          state.activeWorkspaceDetails?.id === id
            ? { ...state.activeWorkspaceDetails, ...updated }
            : state.activeWorkspaceDetails,
      }));

      return { success: true, workspace: updated };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to update workspace',
        fieldErrors: err.fieldErrors || {},
      };
    }
  },

  deleteWorkspace: async (id) => {
    try {
      await workspaceService.deleteWorkspace(id);
      const remaining = get().workspaces.filter((ws) => ws.id !== id);
      const nextActiveId =
        get().activeWorkspaceId === id ? remaining[0]?.id || null : get().activeWorkspaceId;

      writeSavedWorkspaceId(nextActiveId);
      set({
        workspaces: remaining,
        activeWorkspaceId: nextActiveId,
        activeWorkspaceDetails:
          get().activeWorkspaceDetails?.id === id ? null : get().activeWorkspaceDetails,
        members: get().activeWorkspaceId === id ? [] : get().members,
        users: get().activeWorkspaceId === id ? [] : get().users,
      });

      if (nextActiveId && nextActiveId !== id) {
        await get().fetchWorkspaceContext(nextActiveId);
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to delete workspace',
      };
    }
  },

  regenerateInviteCode: async (id) => {
    try {
      const inviteCode = await workspaceService.generateInviteCode(id);
      set((state) => ({
        workspaces: state.workspaces.map((ws) =>
          ws.id === id ? { ...ws, inviteCode } : ws
        ),
        activeWorkspaceDetails:
          state.activeWorkspaceDetails?.id === id
            ? { ...state.activeWorkspaceDetails, inviteCode }
            : state.activeWorkspaceDetails,
      }));
      return { success: true, inviteCode };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to generate invite code',
      };
    }
  },

  joinByInviteCode: async (inviteCode) => {
    try {
      const workspace = await workspaceService.joinWorkspace(inviteCode);
      if (!workspace) {
        return { success: false, error: 'Failed to join workspace' };
      }

      writeSavedWorkspaceId(workspace.id);
      set((state) => ({
        workspaces: [workspace, ...state.workspaces.filter((w) => w.id !== workspace.id)],
        activeWorkspaceId: workspace.id,
        activeWorkspaceDetails: workspace,
        hasLoadedWorkspaces: true,
        workspaceError: null,
      }));

      await get().fetchWorkspaceContext(workspace.id);
      return { success: true, workspace };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to join workspace',
      };
    }
  },

  removeMember: async (workspaceId, userId, currentUserId) => {
    try {
      await workspaceService.removeMember(workspaceId, userId);

      const isSelfLeaving = currentUserId && userId === currentUserId;
      if (isSelfLeaving) {
        const remaining = get().workspaces.filter((ws) => ws.id !== workspaceId);
        const nextActiveId =
          get().activeWorkspaceId === workspaceId
            ? remaining[0]?.id || null
            : get().activeWorkspaceId;

        writeSavedWorkspaceId(nextActiveId);
        set({
          workspaces: remaining,
          activeWorkspaceId: nextActiveId,
          activeWorkspaceDetails: null,
          members: [],
          users: [],
        });

        if (nextActiveId) {
          await get().fetchWorkspaceContext(nextActiveId);
        }
        return { success: true, leftWorkspace: true };
      }

      set((state) => {
        const updatedMembers = state.members.filter((m) => m.id !== userId);
        return {
          members: updatedMembers,
          users: updatedMembers,
        };
      });
      return { success: true, leftWorkspace: false };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to update workspace membership',
      };
    }
  },

  resetWorkspaceState: () => {
    contextRequestCounter += 1;
    writeSavedWorkspaceId(null);
    set({
      workspaces: [],
      activeWorkspaceId: null,
      activeWorkspaceDetails: null,
      members: [],
      users: [],
      isLoadingWorkspaces: false,
      isLoadingMembers: false,
      hasLoadedWorkspaces: false,
      workspaceError: null,
      ...initialTransitionalState,
    });
  },

  // Transitional helpers kept no-op/filter-only until Milestones 5-7 migrate consumers
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () =>
    set({
      filters: {
        search: '',
        priority: 'all',
        assigneeId: 'all',
        tag: 'all',
        sortBy: 'default',
      },
    }),
}));

registerLogoutCleanup(() => {
  useWorkspaceStore.getState().resetWorkspaceState();
});
