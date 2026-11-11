import React, { useState, useEffect } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';
import { useUIStore } from '../../store/useUIStore';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Check,
  X,
} from 'lucide-react';

export const KanbanColumn = ({
  list,
  index,
  totalLists,
  cards = [],
  isCardDragDisabled = false,
  onRenameList,
  onMoveListLeft,
  onMoveListRight,
  onRequestDeleteList,
}) => {
  const { openCreateCard } = useUIStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(list.name);
  const [isSavingRename, setIsSavingRename] = useState(false);

  useEffect(() => {
    setDraftName(list.name);
  }, [list.name]);

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(list.name);
      setIsRenaming(false);
      return;
    }
    if (trimmed === list.name) {
      setIsRenaming(false);
      return;
    }

    setIsSavingRename(true);
    const result = await onRenameList(list.id, trimmed);
    setIsSavingRename(false);
    if (result?.success !== false) {
      setIsRenaming(false);
    }
  };

  return (
    <Draggable draggableId={`list:${list.id}`} index={index}>
      {(listProvided, listSnapshot) => (
        <div
          ref={listProvided.innerRef}
          {...listProvided.draggableProps}
          className={`flex flex-col w-[300px] min-w-[280px] rounded-xl bg-sidebar border overflow-hidden flex-shrink-0 transition-shadow ${
            listSnapshot.isDragging
              ? 'border-brand ring-1 ring-brand/40 shadow-popover'
              : 'border-line shadow-card'
          }`}
        >
          {/* List Header */}
          <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-b border-line bg-sidebar">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span
                {...listProvided.dragHandleProps}
                aria-label={`Drag list ${list.name}`}
                className="p-1 rounded text-ink-muted hover:text-ink cursor-grab active:cursor-grabbing flex-shrink-0"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </span>

              {isRenaming ? (
                <form onSubmit={handleRenameSubmit} className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setDraftName(list.name);
                        setIsRenaming(false);
                      }
                    }}
                    aria-label={`Rename list ${list.name}`}
                    autoFocus
                    disabled={isSavingRename}
                    className="w-full rounded bg-surface border border-brand px-2 py-0.5 text-xs font-semibold text-ink focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Save list name"
                    disabled={isSavingRename}
                    className="p-1 rounded text-success hover:bg-success-subtle"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel rename"
                    onClick={() => {
                      setDraftName(list.name);
                      setIsRenaming(false);
                    }}
                    className="p-1 rounded text-ink-muted hover:bg-subtle"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-ink truncate" title={list.name}>
                    {list.name}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[11px] font-mono bg-surface text-ink-muted border border-line flex-shrink-0">
                    {cards.length}
                  </span>
                </>
              )}
            </div>

            {!isRenaming && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={onMoveListLeft}
                  disabled={index === 0}
                  aria-label={`Move ${list.name} left`}
                  title="Move list left"
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onMoveListRight}
                  disabled={index >= totalLists - 1}
                  aria-label={`Move ${list.name} right`}
                  title="Move list right"
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(true)}
                  aria-label={`Rename ${list.name}`}
                  title="Rename list"
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-subtle transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDeleteList(list)}
                  aria-label={`Delete ${list.name}`}
                  title="Delete list"
                  className="p-1 rounded text-ink-muted hover:text-danger hover:bg-danger-subtle transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openCreateCard(list.id)}
                  aria-label={`Add card to ${list.name}`}
                  title={`Add card to ${list.name}`}
                  className="p-1 rounded text-ink-muted hover:text-brand hover:bg-subtle transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Droppable Card Container */}
          <Droppable droppableId={list.id} type="CARD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 min-h-[260px] transition-colors ${
                  snapshot.isDraggingOver ? 'bg-brand-subtle ring-1 ring-inset ring-brand/30' : ''
                }`}
              >
                {cards.map((card, cardIdx) => (
                  <TaskCard
                    key={card.id}
                    card={card}
                    index={cardIdx}
                    isDragDisabled={isCardDragDisabled}
                  />
                ))}
                {provided.placeholder}

                {cards.length === 0 && !snapshot.isDraggingOver && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-line rounded-xl text-center">
                    <span className="text-xs text-ink-muted mb-2">No cards in {list.name}</span>
                    <button
                      type="button"
                      onClick={() => openCreateCard(list.id)}
                      className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add card</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </Droppable>

          {/* Footer Add Card */}
          <div className="p-2 border-t border-line bg-sidebar">
            <button
              type="button"
              onClick={() => openCreateCard(list.id)}
              className="w-full py-1.5 rounded-lg text-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors flex items-center justify-center gap-1.5 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
};
