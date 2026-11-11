import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import { AvatarGroup } from '../common/Avatar';
import { PriorityBadge } from '../common/Badge';
import { Calendar, Paperclip } from 'lucide-react';

const resolveAssignees = (assignees = [], members = []) => {
  const memberById = new Map(members.map((m) => [m.id, m]));
  return assignees
    .map((entry) => {
      if (entry && typeof entry === 'object' && entry.name) return entry;
      const id = typeof entry === 'string' ? entry : entry?.id;
      return memberById.get(id) || (id ? { id, name: 'Member' } : null);
    })
    .filter(Boolean);
};

export const TaskCard = ({ card, task, index, isDragDisabled = false }) => {
  const item = card || task;
  const { members } = useWorkspaceStore();
  const { openCardDetails } = useUIStore();

  if (!item) return null;

  const assignedUsers = resolveAssignees(item.assignees || [], members);
  const labels = Array.isArray(item.labels) ? item.labels : [];
  const attachmentCount = Array.isArray(item.attachments) ? item.attachments.length : 0;

  const dueDateObj = item.dueDate ? new Date(item.dueDate) : null;
  const hasValidDate = dueDateObj && !Number.isNaN(dueDateObj.getTime());
  const dueDateLabel = hasValidDate
    ? dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isOverdue = hasValidDate && dueDateObj < todayStart;

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => openCardDetails(item.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openCardDetails(item.id);
            }
          }}
          className={`group rounded-xl border p-3.5 select-none transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            snapshot.isDragging
              ? 'bg-elevated border-brand shadow-2xl scale-[1.02] ring-2 ring-brand/40 z-50'
              : 'bg-canvas/60 hover:bg-subtle border-line hover:border-line-strong shadow-sm'
          }`}
          style={provided.draggableProps.style}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <PriorityBadge priority={item.priority || 'medium'} />
            {isDragDisabled && (
              <span className="text-[10px] text-ink-muted" title="Reset custom sort to drag cards">
                Sorted
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-ink group-hover:text-brand line-clamp-2 leading-snug mb-2 transition-colors">
            {item.title}
          </h4>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {labels.map((label) => (
                <span
                  key={label}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-subtle text-ink-secondary border border-line"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Footer Metadata */}
          {(dueDateLabel || attachmentCount > 0 || assignedUsers.length > 0) && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-line text-xs text-ink-muted">
              <div className="flex items-center gap-2.5">
                {dueDateLabel && (
                  <div
                    className={`flex items-center gap-1 text-[11px] ${
                      isOverdue ? 'text-rose-500 font-semibold' : 'text-ink-muted'
                    }`}
                    title={isOverdue ? `Overdue (${dueDateLabel})` : `Due ${dueDateLabel}`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>{dueDateLabel}</span>
                  </div>
                )}

                {attachmentCount > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-ink-muted">
                    <Paperclip className="w-3 h-3" />
                    <span>{attachmentCount}</span>
                  </div>
                )}
              </div>

              {assignedUsers.length > 0 && (
                <AvatarGroup users={assignedUsers} max={3} size="xs" />
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};
