import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard,
  KanbanSquare,
  Layers,
  FolderKanban,
  Users,
  Activity,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Flame,
  CheckCircle2,
  Sparkles,
  Zap,
  Check,
  Building,
  ShieldCheck,
  Radio
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    projects,
    activeProjectId,
    setActiveProjectId,
    setFilter,
    resetFilters
  } = useWorkspaceStore();

  const {
    sidebarCollapsed,
    toggleSidebar,
    openCreateProject,
    pingLatency,
  } = useUIStore();

  const { user } = useAuthStore();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Active Board', path: '/board', icon: KanbanSquare },
    { name: 'Backlog & Sprints', path: '/backlog', icon: Layers },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Team Directory', path: '/team', icon: Users },
    { name: 'Activity Feed', path: '/activity', icon: Activity },
  ];

  const handleQuickFilter = (type) => {
    if (location.pathname !== '/board') {
      navigate('/board');
    }
    if (type === 'my_issues') {
      resetFilters();
      setFilter('assigneeId', user?.id || 'user-1');
    } else if (type === 'urgent') {
      resetFilters();
      setFilter('priority', 'urgent');
    }
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 bottom-0 bg-[#0c121e] border-r border-slate-800/80 z-40 transition-all duration-300 flex flex-col justify-between select-none ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Workspace Switcher Header */}
          <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-800/80 relative">
            <div
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/70 transition-colors flex-1"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20 flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>

              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <span className="text-sm font-semibold text-slate-100 truncate leading-tight">
                    {activeWorkspace?.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    {activeWorkspace?.plan} Workspace
                  </span>
                </div>
              )}

              {!sidebarCollapsed && (
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
              )}
            </div>

            {/* Workspace Selector Dropdown */}
            {workspaceMenuOpen && (
              <div
                className="absolute left-3 top-14 w-60 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Workspace
                </div>
                <div className="py-1">
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-800/80 transition-colors ${
                        ws.id === activeWorkspaceId ? 'text-indigo-400 bg-indigo-950/30 font-medium' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-mono text-[10px]">
                          {ws.code}
                        </div>
                        <span className="truncate">{ws.name}</span>
                      </div>
                      {ws.id === activeWorkspaceId && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
            {/* Main Views */}
            <div className="space-y-0.5">
              {!sidebarCollapsed && (
                <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Workspace Views
                </div>
              )}
              {navLinks.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                    }
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>

            {/* Quick Filters */}
            {!sidebarCollapsed && (
              <div className="space-y-0.5">
                <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Filters
                </div>
                <button
                  onClick={() => handleQuickFilter('my_issues')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>My Assigned Tasks</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 px-1 rounded bg-slate-800">
                    Active
                  </span>
                </button>
                <button
                  onClick={() => handleQuickFilter('urgent')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Blockers / Urgent</span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 px-1.5 py-0.2 rounded bg-rose-950/40 border border-rose-800/40">
                    Priority
                  </span>
                </button>
              </div>
            )}

            {/* Projects in Workspace */}
            {!sidebarCollapsed && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 pb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Initiatives
                  </span>
                  <button
                    onClick={openCreateProject}
                    className="p-1 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-800 transition-colors"
                    title="Add new initiative"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        navigate(`/projects/${proj.id}`);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left ${
                        proj.id === activeProjectId
                          ? 'bg-slate-800/90 text-slate-100 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase ml-1">
                        {proj.key}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Area */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex flex-col gap-2">
          {/* Settings link */}
          <NavLink
            to="/settings"
            title={sidebarCollapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'text-indigo-400 bg-indigo-950/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
            }
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>Workspace Settings</span>}
          </NavLink>

          {/* Latency / Socket health */}
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-mono text-slate-400 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYNC STATUS</span>
              </span>
              <span className="text-emerald-400 font-semibold">{pingLatency}ms LIVE</span>
            </div>
          )}

          {/* Collapse sidebar button */}
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors w-full mt-1"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Navigation</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

