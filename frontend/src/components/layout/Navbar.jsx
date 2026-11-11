import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { NotificationsDropdown } from './NotificationsDropdown';
import { Avatar, AvatarGroup } from '../common/Avatar';
import { Button } from '../common/Button';
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Radio,
  Menu,
  Shield,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    openCommandPalette,
    openCreateTask,
    theme,
    toggleTheme,
    pingLatency,
  } = useUIStore();

  const {
    workspaces,
    activeWorkspaceId,
    projects,
    activeProjectId,
    users
  } = useWorkspaceStore();

  const { user, logout } = useAuthStore();
  const { notifications } = useNotificationStore();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const activeProject = projects.find(p => p.id === activeProjectId);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 h-14 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 z-30 px-4 flex items-center justify-between select-none transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Left Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 min-w-0">
          <span className="font-semibold text-slate-200 hidden sm:inline truncate">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-slate-200 truncate font-medium">
            {activeProject?.name || 'Project'}
          </span>
          <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
            {activeProject?.sprint || 'Sprint 24'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Search Trigger */}
        <button
          onClick={openCommandPalette}
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-400 hover:text-slate-200 transition-all text-xs"
        >
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Search workspace...</span>
            <span className="md:hidden">Search</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/80 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Real-time Socket Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-400 font-medium">
            Socket.io • {pingLatency}ms
          </span>
        </div>

        {/* Presence Avatars */}
        <div className="hidden lg:block">
          <AvatarGroup users={users.filter(u => u.status === 'online')} max={3} size="xs" />
        </div>

        {/* Quick New Issue Button */}
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => openCreateTask('todo')}
          className="hidden sm:inline-flex shadow-sm"
        >
          <span>Issue</span>
          <kbd className="ml-1 text-[10px] font-mono bg-indigo-700/80 px-1 rounded text-indigo-100">C</kbd>
        </Button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-300" />
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>

          <NotificationsDropdown
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
        </div>

        {/* Profile Menu Popover */}
        <div className="relative pl-1 border-l border-slate-800" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Avatar user={user} size="sm" />
            <span className="text-xs font-medium text-slate-200 hidden md:inline truncate max-w-[90px]">
              {user?.name?.split(' ')[0] || 'Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Profile summary */}
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs font-semibold text-slate-100 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{user?.role || 'Engineer'}</span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/team');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Workspace Roles</span>
                </button>
              </div>

              {/* Logout */}
              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

