import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import { Avatar } from '../common/Avatar';
import { PriorityBadge } from '../common/Badge';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  MoreVertical,
  Flame,
  ArrowRight
} from 'lucide-react';

export const TaskCard = ({ task, index }) => {
  const { users, moveTask, deleteTask } = useWorkspaceStore();
  const { openTaskDetails } = useUIStore();

  const assignee = users.find(u => u.id === task.assigneeId);
  const completedSubtasks = (task.subtasks || []).filter(st => st.done).length;
  const totalSubtasks = (task.subtasks || []).length;
  const commentCount = (task.comments || []).length;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  const handleNextStatus = (e) => {
    e.stopPropagation();
    const statusFlow = ['todo', 'in_progress', 'in_review', 'completed'];
    const currentIdx = statusFlow.indexOf(task.status);
    if (currentIdx < statusFlow.length - 1) {
      moveTask(task.id, statusFlow[currentIdx + 1], 0);
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => openTaskDetails(task.id)}
          className={`group relative rounded-xl border p-3.5 select-none transition-all duration-150 cursor-pointer ${
            snapshot.isDragging
              ? 'bg-slate-800 border-indigo-500 shadow-2xl scale-[1.02] ring-2 ring-indigo-500/40 z-50'
              : 'bg-[#111827]/80 hover:bg-[#162032] border-slate-800/80 hover:border-slate-700 shadow-sm'
          }`}
          style={provided.draggableProps.style}
        >
          {/* Top Bar: Key & Priority */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                {task.key}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status !== 'completed' && (
                <button
                  onClick={handleNextStatus}
                  className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-700/60 transition-colors"
                  title="Move to next stage"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug mb-2.5">
            {task.title}
          </h4>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {task.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Subtask Progress Bar (if any) */}
          {totalSubtasks > 0 && (
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3 text-slate-500" />
                  <span>Subtasks</span>
                </span>
                <span className="font-mono text-[10px]">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Bottom Row: Metadata & Assignee */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              {/* Due date */}
              {task.dueDate && (
                <div
                  className={`flex items-center gap-1 text-[11px] font-mono ${
                    isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
                  }`}
                  title={isOverdue ? 'Overdue!' : `Due ${task.dueDate}`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{task.dueDate.substring(5)}</span>
                </div>
              )}

              {/* Story points */}
              {task.storyPoints !== undefined && (
                <span
                  className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60"
                  title="Story Points"
                >
                  {task.storyPoints}pt
                </span>
              )}

              {/* Comments counter */}
              {commentCount > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MessageSquare className="w-3 h-3" />
                  <span>{commentCount}</span>
                </div>
              )}
            </div>

            {/* Assignee Avatar */}
            {assignee && (
              <div title={`Assigned to ${assignee.name}`}>
                <Avatar user={assignee} size="xs" ring={false} />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

