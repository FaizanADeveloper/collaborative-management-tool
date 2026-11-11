import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardStore } from '../../store/useBoardStore';
import { useUIStore } from '../../store/useUIStore';
import { FolderKanban, ArrowRight, Plus, Calendar } from 'lucide-react';
import { Button } from '../common/Button';

export const ProjectProgressCards = () => {
  const { boards, activeBoardId, lists, cardsByList, setActiveBoardId } = useBoardStore();
  const { openCreateBoard } = useUIStore();
  const navigate = useNavigate();

  const activeBoardCardCount = Object.values(cardsByList).reduce(
    (sum, listCards) => sum + (listCards?.length || 0),
    0
  );

  return (
    <div className="rounded-xl bg-surface border border-line p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-brand" />
            <span>Workspace Boards</span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Jump directly into any board in your current workspace
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/boards')}
          className="text-xs text-brand hover:underline font-medium"
        >
          All boards
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="py-8 text-center space-y-3 border border-dashed border-line rounded-xl">
          <p className="text-xs text-ink-muted">No boards created in this workspace yet.</p>
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateBoard}>
            Create First Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {boards.map((board) => {
            const isActive = board.id === activeBoardId;
            const createdLabel = board.createdAt
              ? new Date(board.createdAt).toLocaleDateString()
              : null;

            return (
              <button
                type="button"
                key={board.id}
                onClick={() => {
                  setActiveBoardId(board.id);
                  navigate(`/boards/${board.id}`);
                }}
                className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 group ${
                  isActive
                    ? 'bg-brand-subtle/40 border-brand/40'
                    : 'bg-subtle/50 hover:bg-subtle border-line hover:border-line-strong'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-ink group-hover:text-brand truncate">
                      {board.name}
                    </h4>
                    {isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-subtle text-brand border border-brand/30 flex-shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-secondary line-clamp-2">
                    {board.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line text-[11px] text-ink-muted w-full">
                  <span className="inline-flex items-center gap-1">
                    {isActive ? (
                      <>
                        {lists.length} lists • {activeBoardCardCount} cards
                      </>
                    ) : createdLabel ? (
                      <>
                        <Calendar className="w-3 h-3" />
                        <span>{createdLabel}</span>
                      </>
                    ) : (
                      'Workspace board'
                    )}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-brand" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
