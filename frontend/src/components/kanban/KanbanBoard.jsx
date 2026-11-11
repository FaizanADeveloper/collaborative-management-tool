import React, { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { TaskFilters } from './TaskFilters';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { BoardSkeleton } from '../common/Skeleton';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Columns3,
} from 'lucide-react';

export const KanbanBoard = () => {
  const { user } = useAuthStore();
  const { activeWorkspaceId, workspaces, activeWorkspaceDetails } = useWorkspaceStore();
  const {
    boards,
    activeBoardId,
    activeBoard,
    lists,
    cardsByList,
    isLoadingBoards,
    isLoadingBoardDetails,
    boardError,
    setActiveBoardId,
    deleteBoard,
    createList,
    renameList,
    reorderList,
    deleteList,
  } = useBoardStore();
  const {
    openCreateBoard,
    openEditBoard,
    openCreateWorkspace,
    openJoinWorkspace,
    addToast,
  } = useUIStore();

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listSubmitError, setListSubmitError] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  const [listToDelete, setListToDelete] = useState(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  const [confirmDeleteBoardOpen, setConfirmDeleteBoardOpen] = useState(false);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);

  const activeWorkspace =
    activeWorkspaceDetails || workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const currentBoard = activeBoard || boards.find((b) => b.id === activeBoardId) || null;
  const userRole = activeWorkspace?.role;
  const creatorId =
    typeof currentBoard?.createdBy === 'string'
      ? currentBoard.createdBy
      : currentBoard?.createdBy?.id;
  const canManageBoard =
    userRole === 'owner' ||
    userRole === 'admin' ||
    Boolean(user?.id && creatorId && creatorId === user.id);

  const totalCards = lists.reduce(
    (sum, list) => sum + (cardsByList[list.id]?.length || 0),
    0
  );

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!currentBoard) return;
    const trimmed = newListName.trim();
    if (!trimmed) {
      setListSubmitError('List name is required');
      return;
    }
    if (trimmed.length > 100) {
      setListSubmitError('List name cannot exceed 100 characters');
      return;
    }

    setListSubmitError('');
    setIsCreatingList(true);
    const result = await createList(currentBoard.id, { name: trimmed });
    setIsCreatingList(false);

    if (!result.success) {
      setListSubmitError(result.error || 'Failed to create list');
      return;
    }

    setNewListName('');
    setIsAddingList(false);
  };

  const handleRenameList = async (listId, nextName) => {
    const result = await renameList(listId, nextName);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to rename list',
        message: result.error,
      });
    }
    return result;
  };

  const handleReorderList = async (listId, targetIndex) => {
    const result = await reorderList(listId, targetIndex);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to reorder list',
        message: result.error,
      });
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!listToDelete) return;
    setIsDeletingList(true);
    const result = await deleteList(listToDelete.id);
    setIsDeletingList(false);

    if (!result.success) {
      addToast({
        type: 'error',
        title: 'Unable to delete list',
        message: result.error,
      });
      return;
    }

    addToast({
      type: 'success',
      title: 'List deleted',
      message: `${listToDelete.name} and its cards were deleted.`,
    });
    setListToDelete(null);
  };

  const handleConfirmDeleteBoard = async () => {
    if (!currentBoard) return;
    setIsDeletingBoard(true);
    const result = await deleteBoard(currentBoard.id);
    setIsDeletingBoard(false);

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
      message: `${currentBoard.name} was deleted.`,
    });
    setConfirmDeleteBoardOpen(false);
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'LIST') {
      const listId = draggableId.startsWith('list:')
        ? draggableId.slice(5)
        : draggableId;
      handleReorderList(listId, destination.index);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No active workspace"
        description="Create or join a workspace before opening Kanban boards."
        actionLabel="Create Workspace"
        onAction={openCreateWorkspace}
        secondaryActionLabel="Join with Invite Code"
        onSecondaryAction={openJoinWorkspace}
      />
    );
  }

  if (isLoadingBoards || (isLoadingBoardDetails && lists.length === 0 && currentBoard)) {
    return <BoardSkeleton />;
  }

  if (boards.length === 0) {
    return (
      <EmptyState
        icon={Columns3}
        title="No boards in this workspace yet"
        description="Create a Kanban board to configure dynamic workflow lists and organize cards."
        actionLabel="Create Board"
        onAction={openCreateBoard}
      />
    );
  }

  if (!currentBoard) {
    return (
      <EmptyState
        icon={Columns3}
        title="Select a board"
        description="Pick a board from the sidebar or create a new one."
        actionLabel="Create Board"
        onAction={openCreateBoard}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Board Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight truncate">
                {currentBoard.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-subtle text-ink-secondary border border-line">
                {lists.length} {lists.length === 1 ? 'list' : 'lists'} • {totalCards}{' '}
                {totalCards === 1 ? 'card' : 'cards'}
              </span>
            </div>
            {currentBoard.description && (
              <p className="text-xs sm:text-sm text-ink-secondary max-w-2xl">
                {currentBoard.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {boards.length > 1 && (
              <select
                aria-label="Switch active board"
                value={currentBoard.id}
                onChange={(e) => setActiveBoardId(e.target.value)}
                className="bg-subtle border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-brand cursor-pointer"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {canManageBoard && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  onClick={() => openEditBoard(currentBoard)}
                >
                  Edit Board
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                  onClick={() => setConfirmDeleteBoardOpen(true)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {boardError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500"
        >
          {boardError}
        </div>
      )}

      {/* Filter Toolbar */}
      <TaskFilters />

      {/* Dynamic Lists Canvas */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-lists" direction="horizontal" type="LIST">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex items-start gap-4 overflow-x-auto pb-6 pt-1"
            >
              {lists.map((list, idx) => (
                <KanbanColumn
                  key={list.id}
                  list={list}
                  index={idx}
                  totalLists={lists.length}
                  cards={cardsByList[list.id] || []}
                  onRenameList={handleRenameList}
                  onMoveListLeft={() => handleReorderList(list.id, idx - 1)}
                  onMoveListRight={() => handleReorderList(list.id, idx + 1)}
                  onRequestDeleteList={(target) => setListToDelete(target)}
                />
              ))}
              {provided.placeholder}

              {/* Add List Composer */}
              <div className="w-[280px] flex-shrink-0">
                {isAddingList ? (
                  <form
                    onSubmit={handleCreateList}
                    className="p-3 rounded-xl bg-surface border border-line-strong shadow-sm space-y-2.5"
                  >
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => {
                        setNewListName(e.target.value);
                        if (listSubmitError) setListSubmitError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsAddingList(false);
                          setNewListName('');
                          setListSubmitError('');
                        }
                      }}
                      placeholder="Enter list name (e.g. Backlog)"
                      aria-label="New list name"
                      autoFocus
                      className="w-full rounded-lg bg-subtle border border-line-strong px-3 py-1.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-brand"
                    />
                    {listSubmitError && (
                      <p role="alert" className="text-xs text-rose-500">
                        {listSubmitError}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        icon={Check}
                        loading={isCreatingList}
                      >
                        Add List
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={X}
                        onClick={() => {
                          setIsAddingList(false);
                          setNewListName('');
                          setListSubmitError('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingList(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-line-strong bg-surface/60 hover:bg-surface text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lists.length === 0 ? 'Add your first list' : 'Add List'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <ConfirmDialog
        isOpen={Boolean(listToDelete)}
        onClose={() => setListToDelete(null)}
        onConfirm={handleConfirmDeleteList}
        loading={isDeletingList}
        variant="danger"
        title={`Delete ${listToDelete?.name || 'list'}?`}
        description="Deleting this list will permanently delete every card inside it."
        confirmLabel="Delete List"
      />

      <ConfirmDialog
        isOpen={confirmDeleteBoardOpen}
        onClose={() => setConfirmDeleteBoardOpen(false)}
        onConfirm={handleConfirmDeleteBoard}
        loading={isDeletingBoard}
        variant="danger"
        title={`Delete ${currentBoard.name}?`}
        description="Deleting this board will permanently delete all lists and cards inside it."
        confirmLabel="Delete Board"
      />
    </div>
  );
};
