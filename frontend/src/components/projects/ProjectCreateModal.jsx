import React, { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select } from '../common/Input';

export const ProjectCreateModal = () => {
  const { isCreateProjectOpen, closeCreateProject } = useUIStore();
  const { addProject, users } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [leadId, setLeadId] = useState(users[0]?.id || '');
  const [color, setColor] = useState('#6366f1');
  const [error, setError] = useState('');

  const colors = [
    '#6366f1', // Indigo
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    const generatedKey = key.trim() || name.substring(0, 3).toUpperCase();

    addProject({
      name: name.trim(),
      key: generatedKey,
      description: description.trim(),
      category,
      leadId,
      color,
    });

    setName('');
    setKey('');
    setDescription('');
    setError('');
    closeCreateProject();
  };

  return (
    <Modal
      isOpen={isCreateProjectOpen}
      onClose={closeCreateProject}
      title="Create New Project / Initiative"
      subtitle="Organize sprints, tasks, and velocity under a centralized scope."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name *"
          placeholder="e.g. Real-Time Telemetry & Observability"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!key) {
              setKey(e.target.value.substring(0, 3).toUpperCase());
            }
            if (error) setError('');
          }}
          error={error}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Project Key (Prefix)"
            placeholder="e.g. TEL"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            helperText="Used for issue IDs (e.g. TEL-101)"
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Infrastructure">Infrastructure</option>
            <option value="Mobile">Mobile Experience</option>
            <option value="Frontend">Frontend / Design</option>
            <option value="Security">Security & Compliance</option>
            <option value="AI">AI & Machine Learning</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Project Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this project aim to achieve?"
            className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <Select
          label="Project Lead"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </Select>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Accent Brand Color
          </label>
          <div className="flex items-center gap-3">
            {colors.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={closeCreateProject}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
};

