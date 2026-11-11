import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUIStore } from '../store/useUIStore';
import { Avatar } from '../components/common/Avatar';
import {
  Activity,
  ArrowRight,
  Plus,
  CheckCircle,
  MessageSquare,
  GitPullRequest,
  Filter,
  Search,
  Calendar
} from 'lucide-react';

export const ActivityPage = () => {
  const { activities, users, tasks } = useWorkspaceStore();
  const { openTaskDetails } = useUIStore();
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const filtered = activities.filter(act => {
    const matchesUser = selectedUser === 'all' || act.userId === selectedUser;
    const matchesType = selectedType === 'all' || act.type === selectedType;
    return matchesUser && matchesType;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'task_moved':
        return <ArrowRight className="w-4 h-4 text-indigo-400" />;
      case 'task_created':
        return <Plus className="w-4 h-4 text-emerald-400" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'comment_added':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'pr_merged':
        return <GitPullRequest className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleTargetClick = (target) => {
    const matchedTask = tasks.find(t => t.key === target);
    if (matchedTask) {
      openTaskDetails(matchedTask.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-400" />
          <span>Real-Time Activity Stream</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete transparent audit log of task status transitions, comments, and sprint changes.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Teammate:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Collaborators</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Event Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Events</option>
              <option value="task_moved">Task Status Moved</option>
              <option value="task_created">Task Created</option>
              <option value="comment_added">Comments</option>
              <option value="pr_merged">PR & Code Integration</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-500">
          {filtered.length} entries recorded
        </span>
      </div>

      {/* Timeline List */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {filtered.map((act) => {
            const author = users.find(u => u.id === act.userId) || { name: 'Collaborator', avatar: null, initials: 'CB' };

            return (
              <div key={act.id} className="relative flex items-start gap-4 group">
                {/* Timeline node */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center flex-shrink-0 z-10" />

                <div className="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 transition-all flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Avatar user={author} size="xs" />
                      <span className="text-xs font-bold text-slate-100">{author.name}</span>
                      <span className="text-xs text-slate-400">({author.role})</span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">
                      {act.time}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    {act.details}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => handleTargetClick(act.target)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 hover:bg-indigo-900/50 transition-colors"
                    >
                      <span>{act.target}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

