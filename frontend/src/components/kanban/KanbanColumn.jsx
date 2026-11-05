import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const KanbanColumn = ({ column, tasks }) => {
  const { openCreateTask } = useUIStore();

  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const columnConfig = {
    todo: {
      title: 'To Do',
      color: 'bg-slate-400',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      accent: 'border-t-slate-500',
    },
    in_progress: {
      title: 'In Progress',
      color: 'bg-indigo-500',
      badge: 'bg-indigo-950/60 text-indigo-300 border-indigo-700/40',
      accent: 'border-t-indigo-500',
    },
    in_review: {
      title: 'In Review',
      color: 'bg-amber-500',
      badge: 'bg-amber-950/60 text-amber-300 border-amber-700/40',
      accent: 'border-t-amber-500',
    },
    completed: {
      title: 'Completed',
      color: 'bg-emerald-500',
      badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40',
      accent: 'border-t-emerald-500',
    },
  };

  const config = columnConfig[column.id] || columnConfig.todo;

  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-sm rounded-xl bg-[#0d1321]/80 border border-slate-800/80 shadow-sm overflow-hidden flex-shrink-0">
      {/* Top accent border */}
      <div className={`h-1 w-full ${config.color}`} />

      {/* Column Header */}
      <div className="px-3.5 py-3 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.color}`} />
          <h3 className="text-sm font-semibold text-slate-100">
            {config.title}
          </h3>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono border ${config.badge}`}>
            {tasks.length}
          </span>
          {totalPoints > 0 && (
            <span className="text-[11px] font-mono text-slate-500">
              {totalPoints}pts
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => openCreateTask(column.id)}
            className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
            title={`Add task to ${config.title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Droppable Task List */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[500px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-950/20 ring-1 ring-indigo-500/30' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-800 rounded-xl text-center">
                <span className="text-xs text-slate-500 mb-2">No tasks in {config.title}</span>
                <button
                  onClick={() => openCreateTask(column.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create issue</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

