import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import {
  Search,
  Plus,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const {
    sidebarCollapsed,
    openMobileSidebar,
    openCommandPalette,
    openCreateTask,
    theme,
    toggleTheme,
  } = useUIStore();

  const { workspaces = [], activeWorkspaceId, projects = [], activeProjectId } =
    useWorkspaceStore();

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 h-14 bg-surface/95 backdrop-blur-sm border-b border-line z-30 px-4 flex items-center justify-between select-none transition-all duration-200 ${
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-60'
      }`}
    >
      {/* Left Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open navigation menu"
          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-ink-muted min-w-0">
          <span className="font-semibold text-ink hidden sm:inline truncate">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          {activeProject && (
            <>
              <span className="text-line-strong hidden sm:inline">/</span>
              <span className="text-ink-secondary truncate">
                {activeProject.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Open quick search"
          className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-subtle border border-line hover:border-line-strong text-ink-muted hover:text-ink transition-colors text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Quick jump...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-surface text-ink-muted border border-line rounded">
            Ctrl+K
          </kbd>
        </button>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => openCreateTask('todo')}
          className="hidden sm:inline-flex"
        >
          New Card
        </Button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-ink-secondary" />
          )}
        </button>

        <div className="relative pl-2 border-l border-line" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Avatar user={user} size="sm" />
            <span className="text-xs font-medium text-ink hidden md:inline truncate max-w-[100px]">
              {user?.name?.split(' ')[0] || 'Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted hidden md:inline" />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl bg-elevated border border-line-strong shadow-xl py-1.5 z-50"
            >
              <div className="px-3 py-2 border-b border-line">
                <p className="text-xs font-semibold text-ink truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-ink-muted truncate">
                  {user?.email || ''}
                </p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-secondary hover:bg-subtle hover:text-ink transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
