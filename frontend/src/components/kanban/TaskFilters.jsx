import React from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Search, X, ArrowUpDown } from 'lucide-react';

export const TaskFilters = () => {
  const { members } = useWorkspaceStore();
  const { filters, setFilter, resetFilters, cardsByList } = useBoardStore();

  const allCards = Object.values(cardsByList).flat();
  const allLabels = Array.from(
    new Set(allCards.flatMap((c) => (Array.isArray(c.labels) ? c.labels : [])))
  ).sort();

  const hasActiveFilters =
    filters.search !== '' ||
    filters.priority !== 'all' ||
    filters.assigneeId !== 'all' ||
    filters.label !== 'all' ||
    filters.sortBy !== 'position';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-line shadow-card">
      {/* Left Search & Filter Controls */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[200px]">
        <div className="relative min-w-[180px] flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            aria-label="Filter cards"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Filter cards by title or label..."
            className="w-full bg-canvas border border-line-strong rounded-lg pl-8 pr-7 py-1.5 text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {filters.search && (
            <button
              type="button"
              aria-label="Clear card search"
              onClick={() => setFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <select
          aria-label="Filter by assignee"
          value={filters.assigneeId}
          onChange={(e) => setFilter('assigneeId', e.target.value)}
          className="bg-canvas border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-ink-secondary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 cursor-pointer"
        >
          <option value="all">All Assignees</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by priority"
          value={filters.priority}
          onChange={(e) => setFilter('priority', e.target.value)}
          className="bg-canvas border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-ink-secondary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 cursor-pointer"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {allLabels.length > 0 && (
          <select
            aria-label="Filter by label"
            value={filters.label}
            onChange={(e) => setFilter('label', e.target.value)}
            className="bg-canvas border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-ink-secondary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 cursor-pointer"
          >
            <option value="all">All Labels</option>
            {allLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-danger hover:bg-danger-subtle transition-colors border border-danger/30"
          >
            <X className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Right Sort Control */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-3.5 h-3.5 text-ink-muted" />
        <select
          aria-label="Sort cards"
          value={filters.sortBy}
          onChange={(e) => setFilter('sortBy', e.target.value)}
          className="bg-canvas border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-ink-secondary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 cursor-pointer"
        >
          <option value="position">Manual Order</option>
          <option value="priority">Sort by Priority</option>
          <option value="dueDate">Sort by Due Date</option>
          <option value="newest">Newest First</option>
        </select>
      </div>
    </div>
  );
};
