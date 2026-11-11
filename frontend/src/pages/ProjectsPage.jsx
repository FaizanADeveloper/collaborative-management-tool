import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useBoardStore } from '../store/useBoardStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  FolderKanban,
  Plus,
  Search,
  ArrowRight,
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react';

export const BoardsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeWorkspaceId, workspaces, activeWorkspaceDetails } = useWorkspaceStore();
  const { boards, isLoadingBoards, boardError, setActiveBoardId, deleteBoard } = useBoardStore();
  const {
    openCreateBoard,
    openEditBoard,
    openCreateWorkspace,
    openJoinWorkspace,
    addToast,
  } = useUIStore();

  const [search, setSearch] = useState('');
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeWorkspace =
    activeWorkspaceDetails || workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const userRole = activeWorkspace?.role;
  const isPrivileged = userRole === 'owner' || userRole === 'admin';

  const canManageBoard = (board) => {
    if (isPrivileged) return true;
    const creatorId = typeof board?.createdBy === 'string' ? board.createdBy : board?.createdBy?.id;
    return Boolean(user?.id && creatorId && creatorId === user.id);
  };

  const filteredBoards = boards.filter((board) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      board.name.toLowerCase().includes(q) ||
      (board.description || '').toLowerCase().includes(q)
    );
  });

  const handleConfirmDelete = async () => {
    if (!boardToDelete) return;
    setIsDeleting(true);
    const result = await deleteBoard(boardToDelete.id);
    setIsDeleting(false);

    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to delete board',
        message: result.error,
      });
      return;
    }

    addToast({
      type: 'success',
      title: 'Board deleted',
      message: `${boardToDelete.name} and its lists and cards were removed.`,
    });
    setBoardToDelete(null);
  };

  if (!activeWorkspaceId) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No active workspace"
        description="Select, create, or join a workspace before viewing or creating Kanban boards."
        actionLabel="Create Workspace"
        onAction={openCreateWorkspace}
        secondaryActionLabel="Join with Invite Code"
        onSecondaryAction={openJoinWorkspace}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Boards
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Kanban boards inside <strong className="text-ink">{activeWorkspace?.name || 'Active Workspace'}</strong>.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={openCreateBoard}>
          New Board
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-line">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter boards by name or description..."
            className="w-full bg-subtle border border-line-strong rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-brand"
          />
        </div>

        <span className="text-xs text-ink-muted">
          {filteredBoards.length} {filteredBoards.length === 1 ? 'board' : 'boards'}
        </span>
      </div>

      {boardError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-500"
        >
          {boardError}
        </div>
      )}

      {isLoadingBoards ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No boards in this workspace yet"
          description="Create your first board to start organizing lists and tracking cards."
          actionLabel="Create Board"
          onAction={openCreateBoard}
        />
      ) : filteredBoards.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching boards"
          description={`No boards match "${search}". Clear the search filter to view all workspace boards.`}
          actionLabel="Clear Filter"
          onAction={() => setSearch('')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoards.map((board) => {
            const manageable = canManageBoard(board);
            const createdLabel = board.createdAt
              ? new Date(board.createdAt).toLocaleDateString()
              : null;

            return (
              <div
                key={board.id}
                className="rounded-xl bg-surface border border-line hover:border-line-strong p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBoardId(board.id);
                        navigate(`/boards/${board.id}`);
                      }}
                      className="text-left group flex-1 min-w-0"
                    >
                      <h2 className="text-base font-semibold text-ink group-hover:text-brand transition-colors truncate">
                        {board.name}
                      </h2>
                    </button>

                    {manageable && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditBoard(board)}
                          aria-label={`Edit ${board.name}`}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoardToDelete(board)}
                          aria-label={`Delete ${board.name}`}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-ink-secondary line-clamp-2 min-h-[2rem]">
                    {board.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    {createdLabel ? `Created ${createdLabel}` : 'Workspace Board'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveBoardId(board.id);
                      navigate(`/boards/${board.id}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    <span>Open Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(boardToDelete)}
        onClose={() => setBoardToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="danger"
        title={`Delete ${boardToDelete?.name || 'board'}?`}
        description="Deleting this board will permanently delete all lists and cards inside it."
        confirmLabel="Delete Board"
      />
    </div>
  );
};

export const ProjectsPage = BoardsPage;
