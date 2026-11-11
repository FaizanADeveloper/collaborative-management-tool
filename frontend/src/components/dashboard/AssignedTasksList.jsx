import React from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AssignedTasksList = () => {
  const { tasks } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { openTaskDetails } = useUIStore();
  const navigate = useNavigate();

  const myTasks = tasks
    .filter(t => t.assigneeId === user?.id || t.assigneeId === 'user-1')
    .slice(0, 5);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Assigned to You</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Your urgent priorities and in-flight issues
          </p>
        </div>

        <button
          onClick={() => navigate('/board')}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          View on board
        </button>
      </div>

      <div className="space-y-2">
        {myTasks.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center italic">No tasks assigned directly to you.</p>
        ) : (
          myTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => openTaskDetails(task.id)}
              className="p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-slate-600 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-indigo-400">
                    {task.key}
                  </span>
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
                <h5 className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                  {task.title}
                </h5>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {task.dueDate && (
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{task.dueDate.substring(5)}</span>
                  </span>
                )}
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

