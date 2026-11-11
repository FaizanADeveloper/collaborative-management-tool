import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Textarea } from '../common/Input';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AlertCircle } from 'lucide-react';

export const WorkspaceCreateModal = () => {
  const { isCreateWorkspaceOpen, closeCreateWorkspace, addToast } = useUIStore();
  const { createWorkspace } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isCreateWorkspaceOpen) {
      setName('');
      setDescription('');
      setFieldErrors({});
      setFormError('');
      setIsSubmitting(false);
    }
  }, [isCreateWorkspaceOpen]);

  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName) {
      errors.name = 'Workspace name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Workspace name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.name = 'Workspace name cannot exceed 100 characters';
    }

    if (trimmedDesc.length > 500) {
      errors.description = 'Workspace description cannot exceed 500 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setIsSubmitting(true);
    const result = await createWorkspace({
      name: name.trim(),
      description: description.trim(),
    });
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Unable to create workspace');
      if (result.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      }
      return;
    }

    addToast({
      type: 'success',
      title: 'Workspace created',
      message: `${result.workspace.name} is now your active workspace.`,
    });
    closeCreateWorkspace();
  };

  return (
    <Modal
      isOpen={isCreateWorkspaceOpen}
      onClose={closeCreateWorkspace}
      title="Create Workspace"
      subtitle="Set up a shared space for boards, lists, cards, and team collaborators."
      maxWidth="max-w-md"
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
          label="Workspace Name *"
          placeholder="e.g. Engineering Core"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
          }}
          error={fieldErrors.name}
          autoFocus
        />

        <Textarea
          label="Description"
          placeholder="Describe the team's focus, goals, or projects..."
          rows={3}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: undefined }));
          }}
          error={fieldErrors.description}
        />

        <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={closeCreateWorkspace} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Create Workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
};
