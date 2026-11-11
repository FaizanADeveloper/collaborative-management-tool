import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useBoardStore } from '../../store/useBoardStore';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { Avatar } from '../common/Avatar';
import { Plus, X, AlertCircle } from 'lucide-react';

export const TaskCreateModal = () => {
  const { isCreateCardOpen, defaultListId, closeCreateCard, addToast } = useUIStore();
  const { members } = useWorkspaceStore();
  const { lists, createCard } = useBoardStore();

  const [listId, setListId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isCreateCardOpen) {
      const initialList =
        lists.find((l) => l.id === defaultListId)?.id || lists[0]?.id || '';
      setListId(initialList);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setSelectedAssignees([]);
      setDueDate('');
      setLabelInput('');
      setLabels([]);
      setFieldErrors({});
      setFormError('');
      setIsSubmitting(false);
    }
  }, [isCreateCardOpen, defaultListId, lists]);

  const toggleAssignee = (memberId) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAddLabel = (e) => {
    if (e) e.preventDefault();
    const trimmed = labelInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      setFieldErrors((prev) => ({
        ...prev,
        labels: 'Labels cannot exceed 50 characters',
      }));
      return;
    }
    if (!labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
    }
    setLabelInput('');
    if (fieldErrors.labels) {
      setFieldErrors((prev) => ({ ...prev, labels: undefined }));
    }
  };

  const handleRemoveLabel = (labelToRemove) => {
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  const validate = () => {
    const errors = {};
    const trimmedTitle = title.trim();
    if (!listId) {
      errors.listId = 'Select a target list';
    }
    if (!trimmedTitle) {
      errors.title = 'Card title is required';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'Card title cannot exceed 200 characters';
    }
    if (description.trim().length > 5000) {
      errors.description = 'Card description cannot exceed 5000 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      assignees: selectedAssignees,
      labels,
    };
    if (dueDate) {
      payload.dueDate = dueDate;
    }

    setIsSubmitting(true);
    const result = await createCard(listId, payload);
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Unable to create card');
      if (result.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      }
      return;
    }

    addToast({
      type: 'success',
      title: 'Card created',
      message: `${result.card.title} added to list.`,
    });
    closeCreateCard();
  };

  return (
    <Modal
      isOpen={isCreateCardOpen}
      onClose={closeCreateCard}
      title="Create Card"
      subtitle="Add a tracked work item to your board."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-danger-subtle border border-danger/30 p-3 text-xs text-danger"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="Card Title *"
          placeholder="e.g. Implement OAuth session validation"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: undefined }));
          }}
          error={fieldErrors.title}
          autoFocus
        />

        <Textarea
          label="Description"
          placeholder="Add context, acceptance criteria, or notes..."
          rows={3}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (fieldErrors.description) {
              setFieldErrors((p) => ({ ...p, description: undefined }));
            }
          }}
          error={fieldErrors.description}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="List *"
            value={listId}
            onChange={(e) => {
              setListId(e.target.value);
              if (fieldErrors.listId) setFieldErrors((p) => ({ ...p, listId: undefined }));
            }}
            error={fieldErrors.listId}
          >
            {lists.length === 0 ? (
              <option value="">No lists available</option>
            ) : (
              lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))
            )}
          </Select>

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Assignees */}
        <div>
          <span className="block text-xs font-medium text-ink-secondary mb-1.5">
            Assignees
          </span>
          {members.length === 0 ? (
            <p className="text-xs text-ink-muted">No workspace members available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const selected = selectedAssignees.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssignee(member.id)}
                    aria-pressed={selected}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      selected
                        ? 'bg-brand-subtle text-brand border-brand font-medium'
                        : 'bg-subtle text-ink-secondary border-line hover:border-line-strong'
                    }`}
                  >
                    <Avatar user={member} size="xs" />
                    <span>{member.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Labels */}
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">
            Labels
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add label (e.g. Frontend) and click Add"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLabel();
                }
              }}
              className="flex-1 rounded-lg bg-surface border border-line-strong px-3 py-1.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={handleAddLabel}>
              Add
            </Button>
          </div>
          {fieldErrors.labels && (
            <p className="mt-1 text-xs text-danger">{fieldErrors.labels}</p>
          )}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-subtle text-brand border border-brand/30"
                >
                  <span>{label}</span>
                  <button
                    type="button"
                    aria-label={`Remove label ${label}`}
                    onClick={() => handleRemoveLabel(label)}
                    className="hover:text-ink"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={closeCreateCard} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={lists.length === 0}
          >
            Create Card
          </Button>
        </div>
      </form>
    </Modal>
  );
};
