import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import {
  X,
  Calendar,
  Clock,
  CheckSquare,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  User,
  Tag,
  AlertCircle,
  FolderKanban,
  CheckCircle2
} from 'lucide-react';

export const TaskDetailsDrawer = () => {
  const { selectedTaskId, closeTaskDetails } = useUIStore();
  const {
    tasks,
    users,
    projects,
    updateTask,
    deleteTask,
    addComment,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
  } = useWorkspaceStore();

  const { user: currentUser } = useAuthStore();

  const [commentText, setCommentText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const task = tasks.find(t => t.id === selectedTaskId);
  const project = projects.find(p => p.id === task?.projectId);
  const assignee = users.find(u => u.id === task?.assigneeId);

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
    }
  }, [task]);

  if (!selectedTaskId || !task) return null;

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (editedTitle.trim() && editedTitle !== task.title) {
      updateTask(task.id, { title: editedTitle.trim() });
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      addComment(task.id, commentText.trim(), currentUser);
      setCommentText('');
    }
  };

  const handleAddSubtaskSubmit = (e) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${task.key}?`)) {
      deleteTask(task.id);
      closeTaskDetails();
    }
  };

  const completedCount = (task.subtasks || []).filter(st => st.done).length;
  const totalCount = (task.subtasks || []).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={closeTaskDetails}
      />

      {/* Slide-out Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-[#0d1321] border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                {task.key}
              </span>
              <span className="text-xs text-slate-400">
                in <strong className="text-slate-200">{project?.name || 'Project'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Delete Issue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={closeTaskDetails}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Title */}
            <div>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                  autoFocus
                  className="w-full text-lg font-bold text-white bg-slate-800/90 border border-indigo-500 rounded-lg p-2 focus:outline-none"
                />
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-lg font-bold text-slate-100 hover:text-indigo-300 transition-colors cursor-pointer rounded px-1 -mx-1 hover:bg-slate-800/40"
                  title="Click to edit title"
                >
                  {task.title}
                </h2>
              )}
            </div>

            {/* Quick Properties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              {/* Status */}
              <div>
                <span className="text-slate-500 block mb-1">Status</span>
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, { status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <span className="text-slate-500 block mb-1">Priority</span>
                <select
                  value={task.priority}
                  onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <span className="text-slate-500 block mb-1">Assignee</span>
                <select
                  value={task.assigneeId}
                  onChange={(e) => updateTask(task.id, { assigneeId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Points */}
              <div>
                <span className="text-slate-500 block mb-1">Story Points</span>
                <select
                  value={task.storyPoints || 3}
                  onChange={(e) => updateTask(task.id, { storyPoints: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {[1, 2, 3, 5, 8, 13, 21].map(pts => (
                    <option key={pts} value={pts}>{pts} pts</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={task.description}
                onChange={(e) => updateTask(task.id, { description: e.target.value })}
                placeholder="Add a detailed description for this issue..."
                className="w-full rounded-xl bg-slate-900/60 border border-slate-800 p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tags & Categorization
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {(task.tags || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-md text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Checklist ({completedCount}/{totalCount})</span>
                </label>
                {totalCount > 0 && (
                  <span className="text-xs font-mono text-indigo-400">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </span>
                )}
              </div>

              {totalCount > 0 && (
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                {(task.subtasks || []).map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 transition-colors group"
                  >
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={st.done}
                        onChange={() => toggleSubtask(task.id, st.id)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className={st.done ? 'line-through text-slate-500' : ''}>
                        {st.title}
                      </span>
                    </label>
                    <button
                      onClick={() => deleteSubtask(task.id, st.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add subtask input */}
              <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a checklist item..."
                  className="flex-1 rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <Button type="submit" size="xs" variant="secondary">
                  Add Item
                </Button>
              </form>
            </div>

            {/* Comments Thread */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Discussion Thread ({(task.comments || []).length})</span>
              </label>

              {/* Existing comments */}
              <div className="space-y-3">
                {(task.comments || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No comments yet. Start the conversation below.</p>
                ) : (
                  (task.comments || []).map((comment) => {
                    const author = users.find(u => u.id === comment.userId) || currentUser;
                    const dateFormatted = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div
                        key={comment.id}
                        className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar user={author} size="xs" />
                            <span className="text-xs font-semibold text-slate-200">
                              {author?.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {dateFormatted}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed pl-6">
                          {comment.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Post comment input */}
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment or mention @teammate..."
                  className="w-full rounded-xl bg-slate-900/80 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={Send}
                    disabled={!commentText.trim()}
                  >
                    Post Comment
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

