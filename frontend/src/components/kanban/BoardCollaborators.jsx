import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar, AvatarGroup } from '../common/Avatar';
import { Users, Circle } from 'lucide-react';

export const BoardCollaborators = () => {
  const activeCollaborators = useBoardStore((state) => state.activeCollaborators);
  const activeBoard = useBoardStore((state) => state.activeBoard);
  const currentUser = useAuthStore((state) => state.user);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!activeBoard) {
    return null;
  }

  const count = activeCollaborators.length;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Active board collaborators: ${count} online`}
        title={`Active collaborators: ${count} online`}
        className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-line-strong text-ink transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        {count > 0 ? (
          <AvatarGroup users={activeCollaborators} max={3} size="xs" />
        ) : (
          <Users className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
        )}

        <span className="text-xs font-medium text-ink-secondary tabular-nums">
          {count} <span className="hidden sm:inline">{count === 1 ? 'online' : 'online'}</span>
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Active collaborators on this board"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 rounded-xl bg-elevated border border-line-strong shadow-popover p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Users className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
              <span>Active Collaborators</span>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              {count} online
            </span>
          </div>

          {count === 0 ? (
            <p className="text-xs text-ink-muted py-2 text-center">
              No active collaborators on this board yet.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1 select-none">
              {activeCollaborators.map((collaborator) => {
                const isSelf = currentUser && String(collaborator.id) === String(currentUser.id);
                return (
                  <li
                    key={collaborator.id}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-subtle transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative">
                        <Avatar user={collaborator} size="sm" />
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-surface"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink truncate leading-tight">
                          {collaborator.name}
                        </p>
                        {collaborator.email && (
                          <p className="text-[10px] text-ink-muted truncate">
                            {collaborator.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isSelf && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                          You
                        </span>
                      )}
                      <span
                        className="text-[10px] text-ink-muted flex items-center gap-0.5"
                        title="Viewing board right now"
                      >
                        <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
