import React, { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select } from '../common/Input';
import { Avatar } from '../common/Avatar';
import { Plus, X, Tag } from 'lucide-react';

export const TaskCreateModal = () => {
  const { isCreateTaskOpen, closeCreateTask, defaultTaskStatus } = useUIStore();
  const { addTask, users, activeProjectId, projects } = useWorkspaceStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(defaultTaskStatus || 'todo');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState(users[0]?.id || '');
  const [storyPoints, setStoryPoints] = useState(3);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(['Feature']);
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [error, setError] = useState('');

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, { id: `st-${Date.now()}`, title: subtaskInput.trim(), done: false }]);
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (id) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    addTask({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId,
      storyPoints: Number(storyPoints) || 3,
      dueDate,
      tags,
      subtasks,
    });

    // Reset and close
    setTitle('');
    setDescription('');
    setTags(['Feature']);
    setSubtasks([]);
    setError('');
    closeCreateTask();
  };

  return (
    <Modal
      isOpen={isCreateTaskOpen}
      onClose={closeCreateTask}
      title="Create New Issue"
      subtitle={`Adding to ${currentProject?.name} (${currentProject?.key})`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Issue Title *"
          placeholder="e.g. Implement WebSocket binary heartbeat frames"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          error={error}
          autoFocus
        />

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 select-none">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context, acceptance criteria, or architectural notes..."
            className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Grid: Status, Priority, Assignee, Story Points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Initial Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed</option>
          </Select>

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🔵 Medium</option>
            <option value="low">⚪ Low</option>
          </Select>

          <Select
            label="Assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Story Points
              </label>
              <select
                value={storyPoints}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {[1, 2, 3, 5, 8, 13, 21].map(pts => (
                  <option key={pts} value={pts}>{pts} pts</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-2 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Tags & Labels
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-200 border border-slate-700"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-400 hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag and press Enter..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag(e);
                }
              }}
              className="flex-1 rounded-lg bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Button type="button" size="xs" variant="secondary" onClick={handleAddTag}>
              Add Tag
            </Button>
          </div>
        </div>

        {/* Subtasks */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Checklist / Subtasks ({subtasks.length})
          </label>
          {subtasks.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-xs"
                >
                  <span className="text-slate-200">{st.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              placeholder="Add a checklist item and press Enter..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddSubtask(e);
                }
              }}
              className="flex-1 rounded-lg bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Button type="button" size="xs" variant="secondary" onClick={handleAddSubtask}>
              Add Item
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={closeCreateTask}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Issue
          </Button>
        </div>
      </form>
    </Modal>
  );
};

