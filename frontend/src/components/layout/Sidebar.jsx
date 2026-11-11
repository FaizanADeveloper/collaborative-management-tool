import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  Users,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Check,
  X,
} from 'lucide-react';

export const Sidebar = () => {
  const navigate = useNavigate();
  const {
    workspaces = [],
    activeWorkspaceId,
    setActiveWorkspaceId,
    projects = [],
    activeProjectId,
    setActiveProjectId,
  } = useWorkspaceStore();

  const {
    sidebarCollapsed,
    mobileSidebarOpen,
    toggleSidebar,
    closeMobileSidebar,
    openCreateProject,
  } = useUIStore();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Active Board', path: '/board', icon: KanbanSquare },
    { name: 'Boards', path: '/projects', icon: FolderKanban },
    { name: 'Team Members', path: '/team', icon: Users },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    closeMobileSidebar();
  };

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Primary Sidebar"
        className={`fixed left-0 top-0 bottom-0 bg-surface border-r border-line z-50 transition-all duration-200 flex flex-col justify-between select-none ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-16 w-60' : 'w-60'}`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Workspace Switcher Header */}
          <div className="h-14 px-3 flex items-center justify-between border-b border-line relative">
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen((prev) => !prev)}
              aria-expanded={workspaceMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2.5 min-w-0 p-1.5 rounded-lg hover:bg-subtle transition-colors flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              </div>

              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold text-ink truncate leading-tight">
                    {activeWorkspace?.name || 'SyncFlow'}
                  </span>
                  <span className="text-[11px] text-ink-muted truncate">
                    {activeWorkspace?.role ? `${activeWorkspace.role}` : 'Workspace'}
                  </span>
                </div>
              )}

              {!sidebarCollapsed && (
                <ChevronDown className="w-4 h-4 text-ink-muted flex-shrink-0" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={closeMobileSidebar}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>

            {workspaceMenuOpen && (
              <div
                role="menu"
                className="absolute left-3 top-14 w-56 rounded-xl bg-elevated border border-line-strong shadow-xl py-1.5 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-line text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Workspaces
                </div>
                <div className="py-1 max-h-60 overflow-y-auto">
                  {workspaces.map((ws) => (
                    <button
                      type="button"
                      key={ws.id}
                      role="menuitem"
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-subtle transition-colors ${
                        ws.id === activeWorkspaceId
                          ? 'text-brand bg-brand-subtle font-medium'
                          : 'text-ink-secondary'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === activeWorkspaceId && (
                        <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav aria-label="Workspace Navigation" className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
            <div className="space-y-0.5">
              {!sidebarCollapsed && (
                <div className="px-3 pb-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Workspace
                </div>
              )}
              {navLinks.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileSidebar}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        isActive
                          ? 'bg-brand-subtle text-brand'
                          : 'text-ink-secondary hover:text-ink hover:bg-subtle'
                      } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                    }
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>

            {!sidebarCollapsed && projects.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 pb-1">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    Boards
                  </span>
                  <button
                    type="button"
                    onClick={openCreateProject}
                    aria-label="Create board"
                    className="p-1 text-ink-muted hover:text-brand rounded hover:bg-subtle transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {projects.map((proj) => (
                    <button
                      type="button"
                      key={proj.id}
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        handleNavigate(`/projects/${proj.id}`);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left ${
                        proj.id === activeProjectId
                          ? 'bg-subtle text-ink font-medium'
                          : 'text-ink-secondary hover:text-ink hover:bg-subtle/60'
                      }`}
                    >
                      <span className="truncate">{proj.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-line flex flex-col gap-1">
          <NavLink
            to="/settings"
            onClick={closeMobileSidebar}
            title={sidebarCollapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isActive
                  ? 'bg-brand-subtle text-brand'
                  : 'text-ink-secondary hover:text-ink hover:bg-subtle'
              } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
            }
          >
            <Settings className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {!sidebarCollapsed && <span>Settings</span>}
          </NavLink>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle transition-colors w-full"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-1.5 text-xs">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
