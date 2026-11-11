import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useBoardStore } from '../../store/useBoardStore';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { PriorityBadge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  X,
  Calendar,
  Plus,
  Trash2,
  Paperclip,
  ExternalLink,
  AlertCircle,
  Columns3,
} from 'lucide-react';

const getCardLocation = (cardsByList, cardId) => {
  for (const [listId, listCards] of Object.entries(cardsByList)) {
    const found = (listCards || []).find((c) => c.id === cardId);
    if (found) return { card: found, listId };
  }
  return { card: null, listId: null };
};

const getAssigneeIds = (assignees = []) =>
  assignees.map((a) => (typeof a === 'string' ? a : a?.id)).filter(Boolean);

const isSafeHttpUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

export const TaskDetailsDrawer = () => {
  const { selectedCardId, closeCardDetails, addToast } = useUIStore();
  const { members } = useWorkspaceStore();
  const {
    lists,
    cardsByList,
    activeBoard,
    updateCard,
    moveCard,
    deleteCard,
  } = useBoardStore();

  const { card, listId } = selectedCardId
    ? getCardLocation(cardsByList, selectedCardId)
    : { card: null, listId: null };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync local form draft only when opening a different card so cross-list moves
  // do not discard unsaved title, description, or metadata edits.
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setPriority(card.priority || 'medium');
      setDueDate(card.dueDate ? String(card.dueDate).slice(0, 10) : '');
      setLabels(Array.isArray(card.labels) ? card.labels : []);
      setAssignees(getAssigneeIds(card.assignees || []));
      setLabelInput('');
      setSaveError('');
    }
  }, [card?.id]);

  if (!selectedCardId || !card) return null;

  const currentList = lists.find((l) => l.id === listId);
  const attachments = Array.isArray(card.attachments) ? card.attachments : [];

  const persistUpdate = async (patch, successMessage) => {
    setSaveError('');
    setIsSaving(true);
    const result = await updateCard(card.id, patch);
    setIsSaving(false);

    if (!result.success) {
      setSaveError(result.error || 'Failed to update card');
      return false;
    }

    if (successMessage) {
      addToast({
        type: 'success',
        title: 'Card updated',
        message: successMessage,
      });
    }
    return true;
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError('Card title is required');
      return;
    }
    if (trimmedTitle.length > 200) {
      setSaveError('Card title cannot exceed 200 characters');
      return;
    }
    if (description.trim().length > 5000) {
      setSaveError('Card description cannot exceed 5000 characters');
      return;
    }

    await persistUpdate(
      {
        title: trimmedTitle,
        description: description.trim(),
        priority,
        dueDate: dueDate ? dueDate : null,
        assignees,
        labels,
      },
      `Saved changes to "${trimmedTitle}".`
    );
  };

  const handleMoveList = async (destinationListId) => {
    if (!destinationListId || destinationListId === listId) return;
    const destCards = cardsByList[destinationListId] || [];
    const result = await moveCard(card.id, listId, destinationListId, destCards.length);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to move card',
        message: result.error,
      });
      return;
    }
    const targetList = lists.find((l) => l.id === destinationListId);
    addToast({
      type: 'success',
      title: 'Card moved',
      message: `Moved to ${targetList?.name || 'selected list'}.`,
    });
  };

  const handleToggleAssignee = (memberId) => {
    setAssignees((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAddLabel = () => {
    const trimmed = labelInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      setSaveError('Labels cannot exceed 50 characters');
      return;
    }
    if (!labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
    }
    setLabelInput('');
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCard(card.id);
    setIsDeleting(false);

    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to delete card',
        message: result.error,
      });
      return;
    }

    addToast({
      type: 'success',
      title: 'Card deleted',
      message: `"${card.title}" was deleted.`,
    });
    setConfirmDeleteOpen(false);
    closeCardDetails();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Card details">
      <div
        className="fixed inset-0 bg-overlay backdrop-blur-[1px] transition-opacity"
        onClick={closeCardDetails}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-2xl bg-surface border-l border-line shadow-popover flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-3 bg-sidebar">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeBoard && (
                <span className="text-xs font-medium text-ink-muted truncate max-w-[160px]">
                  {activeBoard.name}
                </span>
              )}
              {currentList && (
                <>
                  <span className="text-line-strong">/</span>
                  <span className="text-xs font-medium text-brand truncate">
                    {currentList.name}
                  </span>
                </>
              )}
              <PriorityBadge priority={priority} />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label="Delete card"
                title="Delete card"
                className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-subtle transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={closeCardDetails}
                aria-label="Close card details"
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSaveDetails} className="flex-1 overflow-y-auto p-6 space-y-5">
            {saveError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-danger-subtle border border-danger/30 p-3 text-xs text-danger"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            <div>
              <label htmlFor="drawer-card-title" className="block text-xs font-medium text-ink-muted mb-1">
                Card Title
              </label>
              <input
                id="drawer-card-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-surface border border-line-strong px-3 py-2 text-base font-semibold text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-sidebar border border-line">
              <div>
                <label
                  htmlFor="drawer-card-list"
                  className="flex items-center gap-1 text-xs font-medium text-ink-muted mb-1"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>List</span>
                </label>
                <select
                  id="drawer-card-list"
                  value={listId || ''}
                  onChange={(e) => handleMoveList(e.target.value)}
                  className="w-full rounded-lg bg-surface border border-line-strong px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand cursor-pointer"
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="drawer-card-priority"
                  className="block text-xs font-medium text-ink-muted mb-1"
                >
                  Priority
                </label>
                <select
                  id="drawer-card-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg bg-surface border border-line-strong px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="drawer-card-due"
                  className="flex items-center gap-1 text-xs font-medium text-ink-muted mb-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due Date</span>
                </label>
                <input
                  id="drawer-card-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg bg-surface border border-line-strong px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label htmlFor="drawer-card-description" className="block text-xs font-medium text-ink-muted mb-1">
                Description
              </label>
              <textarea
                id="drawer-card-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a clear description for this card..."
                className="w-full rounded-lg bg-surface border border-line-strong px-3 py-2 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <span className="block text-xs font-medium text-ink-muted">Assignees</span>
              {members.length === 0 ? (
                <p className="text-xs text-ink-muted">No workspace members loaded.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => {
                    const selected = assignees.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleToggleAssignee(member.id)}
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
            <div className="space-y-2">
              <span className="block text-xs font-medium text-ink-muted">Labels</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                  placeholder="Add label..."
                  aria-label="New card label"
                  className="flex-1 rounded-lg bg-surface border border-line-strong px-3 py-1.5 text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={handleAddLabel}>
                  Add
                </Button>
              </div>
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-subtle text-brand border border-brand/30"
                    >
                      <span>{label}</span>
                      <button
                        type="button"
                        aria-label={`Remove label ${label}`}
                        onClick={() => setLabels(labels.filter((l) => l !== label))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Read-only Attachments Metadata (if stored on card) */}
            {attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-line">
                <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachments ({attachments.length})</span>
                </span>
                <div className="space-y-1.5">
                  {attachments.map((att, idx) => (
                    <div
                      key={`${att.name}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-subtle border border-line text-xs"
                    >
                      <span className="text-ink font-medium truncate">{att.name}</span>
                      <div className="flex items-center gap-3 text-ink-muted flex-shrink-0">
                        {typeof att.size === 'number' && (
                          <span>{Math.max(1, Math.round(att.size / 1024))} KB</span>
                        )}
                        {isSafeHttpUrl(att.url) && (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-line flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete Card
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={closeCardDetails}>
                  Close
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="danger"
        title={`Delete "${card.title}"?`}
        description="This card will be permanently removed from the board."
        confirmLabel="Delete Card"
      />
    </div>
  );
};
