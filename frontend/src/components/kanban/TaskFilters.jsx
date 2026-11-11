import React from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Search, Filter, X, ArrowUpDown, User } from 'lucide-react';

export const TaskFilters = () => {
  const { filters, setFilter, resetFilters, users, tasks } = useWorkspaceStore();

  // Extract unique tags from current tasks
  const allTags = Array.from(
    new Set(tasks.flatMap(t => t.tags || []))
  );

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.priority !== 'all' ||
    filters.assigneeId !== 'all' ||
    filters.tag !== 'all' ||
    filters.sortBy !== 'default';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
      {/* Left Search and Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Filter tasks..."
            className="w-full bg-slate-800/70 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Assignee Filter */}
        <select
          value={filters.assigneeId}
          onChange={(e) => setFilter('assigneeId', e.target.value)}
          className="bg-slate-800/70 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">All Assignees</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => setFilter('priority', e.target.value)}
          className="bg-slate-800/70 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🔵 Medium</option>
          <option value="low">⚪ Low</option>
        </select>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <select
            value={filters.tag}
            onChange={(e) => setFilter('tag', e.target.value)}
            className="bg-slate-800/70 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 transition-colors border border-rose-900/40"
          >
            <X className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Right Sort Order */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        <select
          value={filters.sortBy}
          onChange={(e) => setFilter('sortBy', e.target.value)}
          className="bg-slate-800/70 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="default">Default Sort</option>
          <option value="priority">Sort by Priority</option>
          <option value="dueDate">Sort by Due Date</option>
          <option value="points">Sort by Story Points</option>
          <option value="newest">Newest First</option>
        </select>
      </div>
    </div>
  );
};

