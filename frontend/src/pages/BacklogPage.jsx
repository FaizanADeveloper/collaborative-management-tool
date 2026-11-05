import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUIStore } from '../store/useUIStore';
import { Avatar } from '../components/common/Avatar';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Layers,
  Plus,
  Play,
  Calendar,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Flame,
  CheckCircle2
} from 'lucide-react';

export const BacklogPage = () => {
  const { tasks, users, projects, activeProjectId, updateTask, moveTask } = useWorkspaceStore();
  const { openCreateTask, openTaskDetails } = useUIStore();

  const [activeSprintExpanded, setActiveSprintExpanded] = useState(true);
  const [backlogExpanded, setBacklogExpanded] = useState(true);

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectTasks = tasks.filter(t => !t.projectId || t.projectId === currentProject?.id);

  // Separate tasks into Active Sprint and Product Backlog
  const sprintTasks = projectTasks.filter(t => t.status === 'in_progress' || t.status === 'in_review');
  const backlogTasks = projectTasks.filter(t => t.status === 'todo');
  const completedTasks = projectTasks.filter(t => t.status === 'completed');

  const sprintPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  const backlogPoints = backlogTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);

  const handleMoveToSprint = (taskId) => {
    updateTask(taskId, { status: 'in_progress' });
  };

  const handleMoveToBacklog = (taskId) => {
    updateTask(taskId, { status: 'todo' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Backlog & Sprint Planning
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
              {currentProject?.key}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Plan, estimate, and prioritize user stories into active iterations.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => openCreateTask('todo')}
        >
          Create Issue
        </Button>
      </div>

      {/* Active Sprint Section */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-sm">
        {/* Sprint Header */}
        <div
          onClick={() => setActiveSprintExpanded(!activeSprintExpanded)}
          className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            {activeSprintExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  Sprint 24 (Active)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  {sprintTasks.length} issues
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {sprintPoints} pts
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Ends Nov 20, 2026 • 4 days remaining
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-indigo-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700/60 hidden sm:inline">
              Goal: Core Engine & Socket.io
            </span>
          </div>
        </div>

        {/* Sprint Issue List */}
        {activeSprintExpanded && (
          <div className="divide-y divide-slate-800/60">
            {sprintTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No active issues in this sprint. Move items from backlog below.
              </div>
            ) : (
              sprintTasks.map((task) => {
                const assignee = users.find(u => u.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskDetails(task.id)}
                    className="p-3.5 hover:bg-slate-800/50 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-semibold text-indigo-400 flex-shrink-0">
                        {task.key}
                      </span>
                      <span className="text-sm text-slate-200 group-hover:text-white truncate">
                        {task.title}
                      </span>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                      {task.storyPoints !== undefined && (
                        <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {task.storyPoints} pts
                        </span>
                      )}
                      {assignee && <Avatar user={assignee} size="xs" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToBacklog(task.id);
                        }}
                        className="text-xs text-slate-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Move to Backlog"
                      >
                        Return to Backlog
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Backlog Section */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-sm">
        {/* Backlog Header */}
        <div
          onClick={() => setBacklogExpanded(!backlogExpanded)}
          className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            {backlogExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  Product Backlog
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {backlogTasks.length} issues
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {backlogPoints} pts
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Future candidate issues and technical debt
              </span>
            </div>
          </div>

          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openCreateTask('todo');
            }}
            icon={Plus}
          >
            Add to Backlog
          </Button>
        </div>

        {/* Backlog Items List */}
        {backlogExpanded && (
          <div className="divide-y divide-slate-800/60">
            {backlogTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                Backlog is currently empty.
              </div>
            ) : (
              backlogTasks.map((task) => {
                const assignee = users.find(u => u.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    onClick={() => openTaskDetails(task.id)}
                    className="p-3.5 hover:bg-slate-800/50 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-semibold text-indigo-400 flex-shrink-0">
                        {task.key}
                      </span>
                      <span className="text-sm text-slate-200 group-hover:text-white truncate">
                        {task.title}
                      </span>
                      <PriorityBadge priority={task.priority} />
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                      {task.storyPoints !== undefined && (
                        <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {task.storyPoints} pts
                        </span>
                      )}
                      {assignee && <Avatar user={assignee} size="xs" />}
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToSprint(task.id);
                        }}
                        iconRight={ArrowRight}
                      >
                        Start Sprint
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

