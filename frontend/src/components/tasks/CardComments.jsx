import React, { useState, useEffect, useRef } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  MessageSquare,
  Send,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export const CardComments = ({ cardId }) => {
  const {
    comments,
    isLoadingComments,
    commentsError,
    fetchComments,
    createComment,
    deleteComment,
    clearComments,
  } = useBoardStore();

  const currentUser = useAuthStore((state) => state.user);
  const members = useWorkspaceStore((state) => state.members);

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (cardId) {
      fetchComments(cardId);
    }
    return () => {
      clearComments();
    };
  }, [cardId, fetchComments, clearComments]);

  const currentUserId = currentUser?.id || currentUser?._id;
  const currentMember = Array.isArray(members)
    ? members.find((m) => String(m.id || m._id) === String(currentUserId))
    : null;
  const isPrivileged = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const canDeleteComment = (comment) => {
    if (!comment) return false;
    const authorId = comment.author?.id || comment.author?._id;
    return isPrivileged || (Boolean(authorId) && String(authorId) === String(currentUserId));
  };

  const handleTextareaChange = (e) => {
    setContent(e.target.value);
    setSubmitError('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setSubmitError('Comment cannot be empty');
      return;
    }
    if (trimmed.length > 2000) {
      setSubmitError('Comment cannot exceed 2000 characters');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const res = await createComment(cardId, trimmed);
    setIsSubmitting(false);

    if (res.success) {
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } else {
      setSubmitError(res.error || 'Failed to post comment');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    setIsDeleting(true);
    const res = await deleteComment(cardId, commentToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      setCommentToDelete(null);
    } else {
      setSubmitError(res.error || 'Failed to delete comment');
      setCommentToDelete(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="card-comments-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Activity & Discussion {comments.length > 0 && `(${comments.length})`}
          </h3>
        </div>
      </div>

      {commentsError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-subtle border border-danger/30 p-2.5 text-xs text-danger"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{commentsError}</span>
        </div>
      )}

      {/* Comment Composer */}
      <div className="rounded-xl bg-sidebar/50 border border-line p-3 space-y-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... (Ctrl+Enter to post)"
          aria-label="Write a comment"
          rows={2}
          disabled={isSubmitting}
          className="w-full bg-transparent resize-none text-xs sm:text-sm text-ink placeholder-ink-muted focus:outline-none"
        />

        {submitError && (
          <div
            role="alert"
            className="flex items-center gap-1.5 text-xs text-danger"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-line/60">
          <span className="text-[11px] text-ink-muted">
            {content.length > 0 && `${content.length}/2000`}
          </span>

          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            loading={isSubmitting}
            icon={Send}
            className="text-xs"
          >
            Comment
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3 pt-1">
        {isLoadingComments && comments.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-ink-muted gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-brand" />
            <span>Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl border border-dashed border-line bg-sidebar/30">
            <MessageSquare className="w-8 h-8 text-ink-muted/40 mb-2" />
            <p className="text-xs font-medium text-ink-secondary">No comments yet</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Be the first to share an update or start the conversation.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const author = comment.author || {};
            const authorName = author.name || 'User';
            const canDelete = canDeleteComment(comment);

            return (
              <div
                key={comment.id}
                className="group rounded-xl bg-sidebar/70 border border-line p-3.5 space-y-2 transition-colors hover:border-line-strong"
                data-testid={`comment-item-${comment.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar user={author} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink truncate">
                          {authorName}
                        </span>
                        <span className="text-[11px] text-ink-muted whitespace-nowrap">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setCommentToDelete(comment)}
                      aria-label="Delete comment"
                      title="Delete comment"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-ink-muted hover:text-danger hover:bg-danger-subtle transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap break-words pl-9">
                  {comment.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(commentToDelete)}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="danger"
        title="Delete comment?"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete Comment"
      />
    </div>
  );
};
