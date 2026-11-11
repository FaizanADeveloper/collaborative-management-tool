import React from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AvatarGroup } from '../common/Avatar';
import { ArrowUpRight, FolderKanban, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProjectProgressCards = () => {
  const { projects, users, setActiveProjectId, toggleProjectStar } = useWorkspaceStore();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            <span>Active Initiatives Overview</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Key deliverables, progress completion and team leads
          </p>
        </div>

        <button
          onClick={() => navigate('/projects')}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          All initiatives
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {projects.map((proj) => {
          const team = users.filter(u => (proj.teamIds || []).includes(u.id));
          const lead = users.find(u => u.id === proj.leadId);

          return (
            <div
              key={proj.id}
              onClick={() => {
                setActiveProjectId(proj.id);
                navigate(`/projects/${proj.id}`);
              }}
              className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                      {proj.name}
                    </h4>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProjectStar(proj.id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      proj.starred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {proj.description}
                </p>
              </div>

              <div>
                {/* Progress bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-200 font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${proj.progress}%`,
                        backgroundColor: proj.color || '#6366f1',
                      }}
                    />
                  </div>
                </div>

                {/* Team & Sprint footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <AvatarGroup users={team} max={3} size="xs" />
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                    {proj.sprint}
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

