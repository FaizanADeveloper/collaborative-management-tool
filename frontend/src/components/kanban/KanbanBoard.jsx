import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { TaskFilters } from './TaskFilters';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../common/Button';
import {
  Timer,
  Plus,
  Flame,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';

export const KanbanBoard = () => {
  const { tasks, moveTask, activeProjectId, projects, filters } = useWorkspaceStore();
  const { openCreateTask } = useUIStore();

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // 1. Filter tasks for current project
  let projectTasks = tasks.filter(t => !t.projectId || t.projectId === currentProject?.id);

  // 2. Apply search filter
  if (filters.search) {
    const q = filters.search.toLowerCase();
    projectTasks = projectTasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.key.toLowerCase().includes(q) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  // 3. Apply assignee filter
  if (filters.assigneeId !== 'all') {
    projectTasks = projectTasks.filter(t => t.assigneeId === filters.assigneeId);
  }

  // 4. Apply priority filter
  if (filters.priority !== 'all') {
    projectTasks = projectTasks.filter(t => t.priority === filters.priority);
  }

  // 5. Apply tag filter
  if (filters.tag !== 'all') {
    projectTasks = projectTasks.filter(t => t.tags && t.tags.includes(filters.tag));
  }

  // 6. Apply sorting
  if (filters.sortBy === 'priority') {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    projectTasks.sort((a, b) => (weights[b.priority] || 0) - (weights[a.priority] || 0));
  } else if (filters.sortBy === 'dueDate') {
    projectTasks.sort((a, b) => new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31'));
  } else if (filters.sortBy === 'points') {
    projectTasks.sort((a, b) => (b.storyPoints || 0) - (a.storyPoints || 0));
  } else if (filters.sortBy === 'newest') {
    projectTasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'in_review', title: 'In Review' },
    { id: 'completed', title: 'Completed' },
  ];

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveTask(draggableId, destination.droppableId, destination.index);
  };

  // Metrics
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalPoints = projectTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  const completedPoints = projectTasks
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-4">
      {/* Sprint Header & Velocity Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e1b4b] border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {currentProject?.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 text-xs font-medium border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Run
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-xs font-mono border border-slate-700/60">
                <Timer className="w-3.5 h-3.5 text-slate-400" />
                4 days left
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              <span className="text-indigo-400 font-semibold">Sprint Goal: </span>
              {currentProject?.description}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => openCreateTask('todo')}
              className="shadow-sm"
            >
              <span>New Issue</span>
              <kbd className="ml-1 text-[10px] font-mono bg-indigo-700/80 px-1 rounded text-indigo-100">C</kbd>
            </Button>
          </div>
        </div>

        {/* Sprint Burn Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[260px] max-w-lg">
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Velocity Completion</span>
                <span className="text-indigo-400 font-bold">{progressPercent}% ({completedPoints}/{totalPoints} pts)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div>
              <span className="text-slate-500 mr-1.5">TASKS</span>
              <span className="text-slate-200 font-bold">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <div>
              <span className="text-slate-500 mr-1.5">POINTS</span>
              <span className="text-emerald-400 font-bold">{completedPoints}</span>
              <span className="text-slate-500"> / {totalPoints}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <TaskFilters />

      {/* Kanban Drag and Drop Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
          {columns.map(column => {
            const columnTasks = projectTasks.filter(t => t.status === column.id);
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
              />
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

