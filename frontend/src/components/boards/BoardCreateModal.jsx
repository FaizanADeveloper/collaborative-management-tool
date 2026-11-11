import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Textarea } from '../common/Input';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useBoardStore } from '../../store/useBoardStore';
import { AlertCircle } from 'lucide-react';

export const BoardCreateModal = () => {
  const { isCreateBoardOpen, editingBoard, closeCreateBoard, addToast } = useUIStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { createBoard, updateBoard } = useBoardStore();

  const isEditMode = Boolean(editingBoard);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isCreateBoardOpen) {
      setName(editingBoard?.name || '');
      setDescription(editingBoard?.description || '');
      setFieldErrors({});
      setFormError('');
      setIsSubmitting(false);
    }
  }, [isCreateBoardOpen, editingBoard]);

  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName) {
      errors.name = 'Board name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Board name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.name = 'Board name cannot exceed 100 characters';
    }

    if (trimmedDesc.length > 500) {
      errors.description = 'Board description cannot exceed 500 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    if (!isEditMode && !activeWorkspaceId) {
      setFormError('Select or create a workspace before creating a board.');
      return;
    }

    setIsSubmitting(true);
    const result = isEditMode
      ? await updateBoard(editingBoard.id, {
          name: name.trim(),
          description: description.trim(),
        })
      : await createBoard(activeWorkspaceId, {
          name: name.trim(),
          description: description.trim(),
        });
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Unable to save board');
      if (result.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      }
      return;
    }

    addToast({
      type: 'success',
      title: isEditMode ? 'Board updated' : 'Board created',
      message: isEditMode
        ? `${result.board.name} details saved.`
        : `${result.board.name} is ready for lists and cards.`,
    });
    closeCreateBoard();
  };

  return (
    <Modal
      isOpen={isCreateBoardOpen}
      onClose={closeCreateBoard}
      title={isEditMode ? 'Edit Board' : 'Create Board'}
      subtitle={
        isEditMode
          ? 'Update board title and description.'
          : 'Create a Kanban board inside your active workspace.'
      }
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="Board Name *"
          placeholder="e.g. Core Platform Roadmap"
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
          placeholder="Outline the scope, sprint workflow, or ownership for this board..."
          rows={3}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: undefined }));
          }}
          error={fieldErrors.description}
        />

        <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={closeCreateBoard} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditMode ? 'Save Changes' : 'Create Board'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
