import React, { useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useUIStore } from '../store/useUIStore';
import { AvatarGroup, Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import {
  FolderKanban,
  Plus,
  Star,
  Calendar,
  Layers,
  ArrowRight,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProjectsPage = () => {
  const { projects, users, setActiveProjectId, toggleProjectStar } = useWorkspaceStore();
  const { openCreateProject } = useUIStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const navigate = useNavigate();

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.key.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Projects & Initiatives
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track multi-sprint roadmaps, team assignments, and delivery milestones.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={openCreateProject}
        >
          New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-slate-800/70 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'Infrastructure', 'Mobile', 'Design', 'Security'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? 'All Tracks' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((proj) => {
          const team = users.filter(u => (proj.teamIds || []).includes(u.id));
          const lead = users.find(u => u.id === proj.leadId);

          return (
            <div
              key={proj.id}
              onClick={() => {
                setActiveProjectId(proj.id);
                navigate(`/projects/${proj.id}`);
              }}
              className="rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 p-5 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                      {proj.key}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProjectStar(proj.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      proj.starred ? 'text-amber-400 bg-amber-950/30' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors mb-2">
                  {proj.name}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {proj.description}
                </p>
              </div>

              <div className="space-y-4 pt-3 border-t border-slate-800/60">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Milestone Progress</span>
                    <span className="text-slate-200 font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${proj.progress}%`,
                        backgroundColor: proj.color || '#6366f1',
                      }}
                    />
                  </div>
                </div>

                {/* Team & Deadline */}
                <div className="flex items-center justify-between text-xs">
                  <AvatarGroup users={team} max={3} size="xs" />
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{proj.dueDate}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

