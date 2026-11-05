import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  FolderKanban,
  Users,
  Plus,
  Moon,
  Sun,
  LayoutDashboard,
  Layers,
  ArrowRight,
  Activity,
  Settings,
  X
} from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../common/Badge';

export const CommandPalette = () => {
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    openCreateTask,
    openCreateProject,
    theme,
    toggleTheme,
    openTaskDetails
  } = useUIStore();
  
  const { tasks, projects, users } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Listen for Ctrl+K / Cmd+K or 'C' shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          useUIStore.getState().openCommandPalette();
        }
      } else if (e.key === 'c' && !isCommandPaletteOpen && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        // Quick create issue
        e.preventDefault();
        openCreateTask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, closeCommandPalette, openCreateTask]);

  if (!isCommandPaletteOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  // Navigation Items
  const navActions = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, category: 'Navigation', action: () => { navigate('/dashboard'); closeCommandPalette(); } },
    { id: 'nav-board', label: 'Go to Kanban Board', icon: FolderKanban, category: 'Navigation', action: () => { navigate('/board'); closeCommandPalette(); } },
    { id: 'nav-backlog', label: 'Go to Backlog & Sprints', icon: Layers, category: 'Navigation', action: () => { navigate('/backlog'); closeCommandPalette(); } },
    { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, category: 'Navigation', action: () => { navigate('/projects'); closeCommandPalette(); } },
    { id: 'nav-team', label: 'Go to Team Directory', icon: Users, category: 'Navigation', action: () => { navigate('/team'); closeCommandPalette(); } },
    { id: 'nav-activity', label: 'Go to Activity Feed', icon: Activity, category: 'Navigation', action: () => { navigate('/activity'); closeCommandPalette(); } },
    { id: 'nav-settings', label: 'Go to Workspace Settings', icon: Settings, category: 'Navigation', action: () => { navigate('/settings'); closeCommandPalette(); } },
  ];

  // Quick System Actions
  const systemActions = [
    { id: 'act-new-task', label: 'Create New Task / Issue', icon: Plus, category: 'Actions', shortcut: 'C', action: () => { closeCommandPalette(); openCreateTask(); } },
    { id: 'act-new-proj', label: 'Create New Project', icon: Plus, category: 'Actions', action: () => { closeCommandPalette(); openCreateProject(); } },
    { id: 'act-toggle-theme', label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, icon: theme === 'dark' ? Sun : Moon, category: 'Actions', action: () => { toggleTheme(); closeCommandPalette(); } },
  ];

  // Matched Tasks
  const matchedTasks = tasks
    .filter(t => 
      t.title.toLowerCase().includes(cleanQuery) || 
      t.key.toLowerCase().includes(cleanQuery) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(cleanQuery)))
    )
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      label: `${t.key}: ${t.title}`,
      subtitle: t.description,
      task: t,
      category: 'Tasks',
      icon: CheckCircle,
      action: () => {
        closeCommandPalette();
        navigate('/board');
        openTaskDetails(t.id);
      }
    }));

  // Matched Projects
  const matchedProjects = projects
    .filter(p => p.name.toLowerCase().includes(cleanQuery) || p.key.toLowerCase().includes(cleanQuery))
    .slice(0, 3)
    .map(p => ({
      id: p.id,
      label: `${p.name} (${p.key})`,
      subtitle: p.description,
      category: 'Projects',
      icon: FolderKanban,
      action: () => {
        closeCommandPalette();
        navigate(`/projects/${p.id}`);
      }
    }));

  // Matched Users
  const matchedUsers = users
    .filter(u => u.name.toLowerCase().includes(cleanQuery) || u.role.toLowerCase().includes(cleanQuery) || u.department.toLowerCase().includes(cleanQuery))
    .slice(0, 3)
    .map(u => ({
      id: u.id,
      label: u.name,
      subtitle: `${u.role} • ${u.department}`,
      category: 'Team Members',
      icon: Users,
      action: () => {
        closeCommandPalette();
        navigate('/team');
      }
    }));

  // Filter items
  const filteredNav = cleanQuery ? navActions.filter(a => a.label.toLowerCase().includes(cleanQuery)) : navActions;
  const filteredSys = cleanQuery ? systemActions.filter(a => a.label.toLowerCase().includes(cleanQuery)) : systemActions;

  const allResults = [
    ...matchedTasks,
    ...matchedProjects,
    ...matchedUsers,
    ...filteredSys,
    ...filteredNav,
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pt-20 px-4 sm:px-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={closeCommandPalette}
      />

      {/* Palette Container */}
      <div className="relative mx-auto max-w-2xl transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl transition-all">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search issues, projects, teammates..."
            className="w-full bg-transparent border-0 px-3 py-4 text-slate-100 placeholder-slate-500 focus:outline-none text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-500 hover:text-slate-300 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded ml-2">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-slate-800/40">
          {allResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-600 mt-1">Try searching for an issue key (e.g. ENG-342), project, or action.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {allResults.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id || index}
                    onClick={item.action}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800/80 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-md bg-slate-800 text-indigo-400 border border-slate-700/60 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                            {item.label}
                          </span>
                          {item.task && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <StatusBadge status={item.task.status} />
                              <PriorityBadge priority={item.task.priority} />
                            </div>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-slate-400 truncate max-w-md">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-slate-500 group-hover:text-indigo-400">
                      {item.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400 rounded">
                          {item.shortcut}
                        </kbd>
                      )}
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider hidden sm:inline">
                        {item.category}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-700 text-slate-400">↑↓</kbd> to navigate</span>
            <span><kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-700 text-slate-400">↵</kbd> to select</span>
            <span><kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-700 text-slate-400">C</kbd> new task</span>
          </div>
          <span className="text-indigo-400 font-medium">SyncFlow v2.4</span>
        </div>
      </div>
    </div>
  );
};

