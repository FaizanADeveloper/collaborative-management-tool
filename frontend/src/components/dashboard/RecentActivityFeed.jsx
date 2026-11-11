import React from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Avatar } from '../common/Avatar';
import { Activity, ArrowRight, GitPullRequest, MessageSquare, CheckCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RecentActivityFeed = ({ limit = 6 }) => {
  const { activities, users } = useWorkspaceStore();
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case 'task_moved':
        return <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />;
      case 'task_created':
        return <Plus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'task_completed':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'comment_added':
        return <MessageSquare className="w-3.5 h-3.5 text-sky-400" />;
      case 'pr_merged':
        return <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const visibleActivities = activities.slice(0, limit);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Recent Workspace Activity</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time audit trail of team events
          </p>
        </div>

        <button
          onClick={() => navigate('/activity')}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          View all
        </button>
      </div>

      <div className="divide-y divide-slate-800/60">
        {visibleActivities.map((act) => {
          const author = users.find(u => u.id === act.userId) || { name: 'Teammate', avatar: null, initials: 'TM' };
          return (
            <div key={act.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
              <Avatar user={author} size="xs" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-100 font-medium">{author.name}</strong>{' '}
                  <span className="text-slate-400">{act.details}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[10px] text-indigo-400 font-medium bg-slate-800 px-1 rounded">
                    {act.target}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {act.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

