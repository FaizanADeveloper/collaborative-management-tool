import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '../services/storageService';
import {
  initialUsers,
  initialWorkspaces,
  initialProjects,
  initialTasks,
  initialActivities,
} from '../services/mockData';

// Ensure storage is initialized
storage.initStorage();

export const useWorkspaceStore = create((set, get) => ({
  users: initialUsers,
  workspaces: storage.get(STORAGE_KEYS.WORKSPACES, initialWorkspaces),
  activeWorkspaceId: storage.get(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, 'ws-2'),
  
  projects: storage.get(STORAGE_KEYS.PROJECTS, initialProjects),
  activeProjectId: 'proj-1', // Default to PulseSync Core Engine
  
  tasks: storage.get(STORAGE_KEYS.TASKS, initialTasks),
  activities: storage.get(STORAGE_KEYS.ACTIVITIES, initialActivities),

  // Filters
  filters: {
    search: '',
    priority: 'all',
    assigneeId: 'all',
    tag: 'all',
    sortBy: 'default',
  },

  setActiveWorkspaceId: (id) => {
    storage.set(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, id);
    // Auto select first project in this workspace if any
    const firstProj = get().projects.find(p => p.workspaceId === id);
    set({
      activeWorkspaceId: id,
      activeProjectId: firstProj ? firstProj.id : get().activeProjectId
    });
  },

  setActiveProjectId: (id) => {
    set({ activeProjectId: id });
  },

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value }
    }));
  },

  resetFilters: () => {
    set({
      filters: {
        search: '',
        priority: 'all',
        assigneeId: 'all',
        tag: 'all',
        sortBy: 'default',
      }
    });
  },

  addTask: (newTaskData) => {
    const { tasks, activeProjectId, projects, users } = get();
    const project = projects.find(p => p.id === activeProjectId) || projects[0];
    
    // Auto-generate key like ENG-351
    const prefix = project?.key || 'TASK';
    const existingNums = tasks
      .filter(t => t.key && t.key.startsWith(prefix))
      .map(t => parseInt(t.key.replace(`${prefix}-`, '')) || 0);
    const nextNum = (Math.max(340, ...existingNums) || 350) + 1;

    const newTask = {
      id: `task-${Date.now()}`,
      key: `${prefix}-${nextNum}`,
      projectId: activeProjectId,
      title: newTaskData.title || 'Untitled Issue',
      description: newTaskData.description || '',
      status: newTaskData.status || 'todo',
      priority: newTaskData.priority || 'medium',
      assigneeId: newTaskData.assigneeId || users[0].id,
      storyPoints: parseInt(newTaskData.storyPoints, 10) || 3,
      tags: newTaskData.tags && newTaskData.tags.length > 0 ? newTaskData.tags : ['Feature'],
      dueDate: newTaskData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      subtasks: newTaskData.subtasks || [],
      comments: []
    };

    const updatedTasks = [newTask, ...tasks];
    storage.set(STORAGE_KEYS.TASKS, updatedTasks);

    // Record activity
    const newActivity = {
      id: `act-${Date.now()}`,
      userId: users[0].id,
      type: 'task_created',
      target: newTask.key,
      details: `created issue "${newTask.title.substring(0, 45)}${newTask.title.length > 45 ? '...' : ''}"`,
      time: 'Just now',
      timestamp: new Date().toISOString()
    };
    const updatedActivities = [newActivity, ...get().activities];
    storage.set(STORAGE_KEYS.ACTIVITIES, updatedActivities);

    set({ tasks: updatedTasks, activities: updatedActivities });
    return newTask;
  },

  updateTask: (taskId, updates) => {
    const { tasks } = get();
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, ...updates };
      }
      return t;
    });

    storage.set(STORAGE_KEYS.TASKS, updatedTasks);
    set({ tasks: updatedTasks });
  },

  deleteTask: (taskId) => {
    const { tasks } = get();
    const taskToDelete = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    storage.set(STORAGE_KEYS.TASKS, updatedTasks);

    if (taskToDelete) {
      const newActivity = {
        id: `act-${Date.now()}`,
        userId: get().users[0].id,
        type: 'task_deleted',
        target: taskToDelete.key,
        details: `deleted task "${taskToDelete.title.substring(0, 40)}"`,
        time: 'Just now',
        timestamp: new Date().toISOString()
      };
      const updatedActivities = [newActivity, ...get().activities];
      storage.set(STORAGE_KEYS.ACTIVITIES, updatedActivities);
      set({ tasks: updatedTasks, activities: updatedActivities });
    } else {
      set({ tasks: updatedTasks });
    }
  },

  moveTask: (taskId, newStatus, newIndex) => {
    const { tasks, users } = get();
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const oldStatus = targetTask.status;
    const sameStatus = oldStatus === newStatus;

    // Filter tasks by column
    const otherTasks = tasks.filter(t => t.id !== taskId);
    const targetColumnTasks = otherTasks.filter(t => t.status === newStatus);
    const nonTargetColumnTasks = otherTasks.filter(t => t.status !== newStatus);

    // Insert updated task at newIndex
    const updatedTask = { ...targetTask, status: newStatus };
    const validIndex = typeof newIndex === 'number' ? Math.min(newIndex, targetColumnTasks.length) : targetColumnTasks.length;
    targetColumnTasks.splice(validIndex, 0, updatedTask);

    const mergedTasks = [...targetColumnTasks, ...nonTargetColumnTasks];
    storage.set(STORAGE_KEYS.TASKS, mergedTasks);

    // If status actually changed, record activity
    if (!sameStatus) {
      const formatStatus = (s) => {
        if (s === 'todo') return 'To Do';
        if (s === 'in_progress') return 'In Progress';
        if (s === 'in_review') return 'In Review';
        if (s === 'completed') return 'Completed';
        return s;
      };

      const newActivity = {
        id: `act-${Date.now()}`,
        userId: users[0].id,
        type: 'task_moved',
        target: targetTask.key,
        details: `moved ${targetTask.key} from ${formatStatus(oldStatus)} to ${formatStatus(newStatus)}`,
        time: 'Just now',
        timestamp: new Date().toISOString()
      };
      const updatedActivities = [newActivity, ...get().activities];
      storage.set(STORAGE_KEYS.ACTIVITIES, updatedActivities);
      set({ tasks: mergedTasks, activities: updatedActivities });
    } else {
      set({ tasks: mergedTasks });
    }
  },

  addComment: (taskId, content, user) => {
    if (!content.trim()) return;
    const { tasks } = get();
    const newComment = {
      id: `c-${Date.now()}`,
      userId: user?.id || get().users[0].id,
      content,
      createdAt: new Date().toISOString()
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: [...(t.comments || []), newComment]
        };
      }
      return t;
    });

    storage.set(STORAGE_KEYS.TASKS, updatedTasks);

    // Add activity
    const targetTask = tasks.find(t => t.id === taskId);
    if (targetTask) {
      const newActivity = {
        id: `act-${Date.now()}`,
        userId: user?.id || get().users[0].id,
        type: 'comment_added',
        target: targetTask.key,
        details: `commented on ${targetTask.key}`,
        time: 'Just now',
        timestamp: new Date().toISOString()
      };
      const updatedActivities = [newActivity, ...get().activities];
      storage.set(STORAGE_KEYS.ACTIVITIES, updatedActivities);
      set({ tasks: updatedTasks, activities: updatedActivities });
    } else {
      set({ tasks: updatedTasks });
    }
  },

  toggleSubtask: (taskId, subtaskId) => {
    const { tasks } = get();
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubs = (t.subtasks || []).map(st => 
          st.id === subtaskId ? { ...st, done: !st.done } : st
        );
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    });

    storage.set(STORAGE_KEYS.TASKS, updatedTasks);
    set({ tasks: updatedTasks });
  },

  addSubtask: (taskId, title) => {
    if (!title.trim()) return;
    const { tasks } = get();
    const newSubtask = {
      id: `st-${Date.now()}`,
      title,
      done: false
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [...(t.subtasks || []), newSubtask]
        };
      }
      return t;
    });

    storage.set(STORAGE_KEYS.TASKS, updatedTasks);
    set({ tasks: updatedTasks });
  },

  deleteSubtask: (taskId, subtaskId) => {
    const { tasks } = get();
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId)
        };
      }
      return t;
    });

    storage.set(STORAGE_KEYS.TASKS, updatedTasks);
    set({ tasks: updatedTasks });
  },

  addProject: (projectData) => {
    const { projects, activeWorkspaceId, users } = get();
    const newProj = {
      id: `proj-${Date.now()}`,
      workspaceId: activeWorkspaceId,
      name: projectData.name || 'New Initiative',
      key: (projectData.key || 'PRJ').toUpperCase(),
      description: projectData.description || 'Sprint initiative in development.',
      status: 'active',
      category: projectData.category || 'Engineering',
      color: projectData.color || '#6366f1',
      progress: 0,
      leadId: projectData.leadId || users[0].id,
      teamIds: [users[0].id, users[1].id],
      sprint: 'Sprint 1',
      dueDate: projectData.dueDate || '2026-12-31',
      starred: false,
    };

    const updatedProjects = [...projects, newProj];
    storage.set(STORAGE_KEYS.PROJECTS, updatedProjects);
    set({ projects: updatedProjects, activeProjectId: newProj.id });
    return newProj;
  },

  toggleProjectStar: (projectId) => {
    const { projects } = get();
    const updated = projects.map(p => 
      p.id === projectId ? { ...p, starred: !p.starred } : p
    );
    storage.set(STORAGE_KEYS.PROJECTS, updated);
    set({ projects: updated });
  },

  resetAllData: () => {
    storage.resetToDefault();
    set({
      workspaces: initialWorkspaces,
      projects: initialProjects,
      tasks: initialTasks,
      activities: initialActivities,
      activeWorkspaceId: 'ws-2',
      activeProjectId: 'proj-1'
    });
  }
}));

