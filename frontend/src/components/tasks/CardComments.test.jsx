import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardComments, formatRelativeTime, formatTypingIndicator } from './CardComments';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useBoardStore } from '../../store/useBoardStore';
import { commentService } from '../../services/commentService';
import { emitCardTyping } from '../../services/socketClient';

vi.mock('../../services/commentService', () => ({
  commentService: {
    listComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

vi.mock('../../services/socketClient', () => ({
  emitCardTyping: vi.fn(),
}));

describe('CardComments Component', () => {
  const mockCardId = 'card-101';

  beforeEach(() => {
    vi.clearAllMocks();
    commentService.listComments.mockResolvedValue([]);
    useAuthStore.setState({
      user: { id: 'u-1', name: 'Alice Author', avatar: '' },
      isAuthenticated: true,
    });
    useWorkspaceStore.setState({
      members: [
        { id: 'u-1', name: 'Alice Author', role: 'member' },
        { id: 'u-2', name: 'Bob Admin', role: 'admin' },
        { id: 'u-3', name: 'Charlie Member', role: 'member' },
      ],
    });
    useBoardStore.setState({
      activeBoardId: 'board-1',
      comments: [],
      isLoadingComments: false,
      commentsError: null,
      activeCommentCardId: null,
    });
  });

  describe('formatRelativeTime helper', () => {
    it('returns "Just now" for timestamps under 60 seconds ago', () => {
      const now = new Date();
      expect(formatRelativeTime(now.toISOString())).toBe('Just now');
    });

    it('returns formatted minutes for timestamps under an hour ago', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinsAgo.toISOString())).toBe('5m ago');
    });

    it('returns formatted hours for timestamps under 24 hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe('2h ago');
    });

    it('returns formatted days for timestamps within a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo.toISOString())).toBe('3d ago');
    });

    it('returns empty string on empty or invalid timestamp', () => {
      expect(formatRelativeTime(null)).toBe('');
      expect(formatRelativeTime('invalid-date')).toBe('');
    });
  });

  it('renders empty state when no comments exist', async () => {
    render(<CardComments cardId={mockCardId} />);
    await waitFor(() => {
      expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Be the first to share an update/i)).toBeInTheDocument();
  });

  it('renders comments list with author name, relative timestamp, and content', async () => {
    const mockComments = [
      {
        id: 'c-1',
        content: 'Discussing card design',
        author: { id: 'u-1', name: 'Alice Author', avatar: '' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c-2',
        content: 'Looks good to me',
        author: { id: 'u-3', name: 'Charlie Member', avatar: '' },
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ];
    commentService.listComments.mockResolvedValueOnce(mockComments);

    render(<CardComments cardId={mockCardId} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Author')).toBeInTheDocument();
    });
    expect(screen.getByText('Discussing card design')).toBeInTheDocument();
    expect(screen.getByText('Charlie Member')).toBeInTheDocument();
    expect(screen.getByText('Looks good to me')).toBeInTheDocument();
  });

  it('allows composing and submitting a new comment', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'c-new',
      content: 'Great progress on this feature!',
      author: { id: 'u-1', name: 'Alice Author' },
      createdAt: new Date().toISOString(),
    };
    commentService.createComment.mockResolvedValueOnce(created);

    render(<CardComments cardId={mockCardId} />);

    await waitFor(() => {
      expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox', { name: /write a comment/i });
    const submitButton = screen.getByRole('button', { name: /comment/i });

    expect(submitButton).toBeDisabled();

    await user.type(textarea, 'Great progress on this feature!');
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    expect(commentService.createComment).toHaveBeenCalledWith(mockCardId, {
      content: 'Great progress on this feature!',
    });
    expect(textarea.value).toBe('');
  });

  it('displays validation error if empty or whitespace comment is submitted', async () => {
    const user = userEvent.setup();
    render(<CardComments cardId={mockCardId} />);

    await waitFor(() => {
      expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox', { name: /write a comment/i });
    await user.type(textarea, '   ');

    const submitButton = screen.getByRole('button', { name: /comment/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays delete control for author and allows deletion via ConfirmDialog', async () => {
    const user = userEvent.setup();
    const mockComment = {
      id: 'c-own',
      content: 'My own comment to delete',
      author: { id: 'u-1', name: 'Alice Author' },
      createdAt: new Date().toISOString(),
    };
    commentService.listComments.mockResolvedValueOnce([mockComment]);
    commentService.deleteComment.mockResolvedValueOnce(null);

    render(<CardComments cardId={mockCardId} />);

    await waitFor(() => {
      expect(screen.getByText('My own comment to delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete comment/i });
    expect(deleteButton).toBeInTheDocument();

    await user.click(deleteButton);

    // Confirm dialog opens
    expect(screen.getByText(/Are you sure you want to delete this comment\?/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete Comment' });
    await user.click(confirmButton);

    expect(commentService.deleteComment).toHaveBeenCalledWith(mockCardId, 'c-own');
  });

  it('hides delete control for non-author regular members', async () => {
    const mockComment = {
      id: 'c-other',
      content: 'Charlie comment',
      author: { id: 'u-3', name: 'Charlie Member' },
      createdAt: new Date().toISOString(),
    };
    commentService.listComments.mockResolvedValueOnce([mockComment]);

    render(<CardComments cardId={mockCardId} />);

    await waitFor(() => {
      expect(screen.getByText('Charlie comment')).toBeInTheDocument();
    });

    // Current user is Alice (u-1, regular member), not Charlie (u-3) and not admin/owner
    expect(screen.queryByRole('button', { name: /delete comment/i })).not.toBeInTheDocument();
  });

  it('shows delete control for workspace admin even if not author (moderation)', async () => {
    // Current user is Bob Admin (u-2)
    useAuthStore.setState({
      user: { id: 'u-2', name: 'Bob Admin' },
      isAuthenticated: true,
    });

    const mockComment = {
      id: 'c-charlie',
      content: 'Charlie comment to moderate',
      author: { id: 'u-3', name: 'Charlie Member' },
      createdAt: new Date().toISOString(),
    };
    commentService.listComments.mockResolvedValueOnce([mockComment]);

    render(<CardComments cardId={mockCardId} />);

    await waitFor(() => {
      expect(screen.getByText('Charlie comment to moderate')).toBeInTheDocument();
    });

    // Bob is admin in workspace, so delete button IS rendered for moderation
    expect(screen.getByRole('button', { name: /delete comment/i })).toBeInTheDocument();
  });

  describe('formatTypingIndicator helper', () => {
    it('returns null when no users are typing', () => {
      expect(formatTypingIndicator([])).toBeNull();
      expect(formatTypingIndicator(null)).toBeNull();
    });

    it('formats single collaborator typing message', () => {
      expect(formatTypingIndicator([{ name: 'Ada Lovelace' }])).toBe('Ada Lovelace is typing...');
    });

    it('formats two collaborators typing message', () => {
      expect(
        formatTypingIndicator([{ name: 'Ada Lovelace' }, { name: 'Charles Babbage' }])
      ).toBe('Ada Lovelace and Charles Babbage are typing...');
    });

    it('formats 3 or more collaborators as "Several people are typing..."', () => {
      expect(
        formatTypingIndicator([
          { name: 'Ada' },
          { name: 'Charles' },
          { name: 'Grace' },
        ])
      ).toBe('Several people are typing...');
    });
  });

  describe('Typing Indicator UI & Outgoing Events', () => {
    it('renders typing indicator when other collaborators are typing on the active card', async () => {
      useBoardStore.setState({
        typingByCard: {
          [mockCardId]: [
            { id: 'u-2', name: 'Bob Admin', avatar: '', timestamp: Date.now() },
          ],
        },
      });

      render(<CardComments cardId={mockCardId} />);

      await waitFor(() => {
        expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
        expect(screen.getByText('Bob Admin is typing...')).toBeInTheDocument();
      });
    });

    it('emits card:typing with isTyping: true when user types in composer', async () => {
      const user = userEvent.setup();
      render(<CardComments cardId={mockCardId} />);

      const textarea = screen.getByLabelText(/write a comment/i);
      await user.type(textarea, 'Hello team');

      expect(emitCardTyping).toHaveBeenCalledWith({
        boardId: 'board-1',
        cardId: mockCardId,
        isTyping: true,
      });
    });

    it('emits card:typing with isTyping: false when comment is submitted', async () => {
      const user = userEvent.setup();
      commentService.createComment.mockResolvedValueOnce({
        id: 'new-c',
        content: 'Done typing',
        card: mockCardId,
        board: 'board-1',
        author: { id: 'u-1', name: 'Alice Author' },
      });

      render(<CardComments cardId={mockCardId} />);

      const textarea = screen.getByLabelText(/write a comment/i);
      await user.type(textarea, 'Done typing');
      emitCardTyping.mockClear();

      const submitButton = screen.getByRole('button', { name: /^comment$/i });
      await user.click(submitButton);

      expect(emitCardTyping).toHaveBeenCalledWith({
        boardId: 'board-1',
        cardId: mockCardId,
        isTyping: false,
      });
    });
  });
});
