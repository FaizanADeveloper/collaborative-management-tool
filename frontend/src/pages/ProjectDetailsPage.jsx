import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUIStore } from '../store/useUIStore';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { Avatar, AvatarGroup } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import {
  FolderKanban,
  KanbanSquare,
  Layers,
  Users,
  LineChart,
  Plus,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const ProjectDetailsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, users, tasks } = useWorkspaceStore();
  const { openCreateTask } = useUIStore();

  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'team' | 'insights'

  const project = projects.find(p => p.id === projectId) || projects[0];
  const projectTasks = tasks.filter(t => t.projectId === project?.id);
  const lead = users.find(u => u.id === project?.leadId);
  const team = users.filter(u => (project?.teamIds || []).includes(u.id));

  const completed = projectTasks.filter(t => t.status === 'completed').length;
  const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
  const inReview = projectTasks.filter(t => t.status === 'in_review').length;
  const todo = projectTasks.filter(t => t.status === 'todo').length;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Projects</span>
      </button>

      {/* Project Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#131b2e] border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: project?.color }}
              />
              <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {project?.key}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {project?.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {project?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {project?.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => openCreateTask('todo')}
            >
              Add Task
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            <span>Interactive Board</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members ({team.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'insights'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Delivery Metrics</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'board' && (
        <KanbanBoard />
      )}

      {activeTab === 'team' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member) => {
            const memberTasks = projectTasks.filter(t => t.assigneeId === member.id);
            return (
              <div
                key={member.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar user={member} size="md" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-100 truncate">{member.name}</h4>
                    <p className="text-xs text-slate-400 truncate">{member.role}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Assigned Issues</span>
                  <span className="font-mono text-indigo-400 font-semibold">{memberTasks.length} active</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">To Do</span>
            <p className="text-2xl font-bold text-white mt-1">{todo}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">In Progress</span>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{inProgress}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">In Review</span>
            <p className="text-2xl font-bold text-amber-400 mt-1">{inReview}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">Completed</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{completed}</p>
          </div>
        </div>
      )}
    </div>
  );
};

