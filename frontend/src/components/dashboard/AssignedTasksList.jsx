import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { PriorityBadge } from '../common/Badge';
import { CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

const cardIncludesUser = (card, userId) => {
  if (!userId || !Array.isArray(card?.assignees)) return false;
  return card.assignees.some((entry) => {
    const id = typeof entry === 'string' ? entry : entry?.id;
    return id === userId;
  });
};

export const AssignedTasksList = () => {
  const { lists, cardsByList } = useBoardStore();
  const { user } = useAuthStore();
  const { openCardDetails } = useUIStore();
  const navigate = useNavigate();

  const listNameById = new Map(lists.map((l) => [l.id, l.name]));
  const allCards = Object.entries(cardsByList).flatMap(([listId, cards]) =>
    (cards || []).map((card) => ({
      ...card,
      listName: listNameById.get(listId) || 'List',
    }))
  );

  const myCards = allCards.filter((card) => cardIncludesUser(card, user?.id)).slice(0, 6);

  return (
    <div className="rounded-xl bg-surface border border-line p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Assigned to You</span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Cards assigned to your account on the active board
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/board')}
          className="text-xs text-brand hover:underline font-medium"
        >
          Open board
        </button>
      </div>

      <div className="space-y-2">
        {myCards.length === 0 ? (
          <p className="text-xs text-ink-muted py-8 text-center">
            No cards on the active board are currently assigned to you.
          </p>
        ) : (
          myCards.map((card) => {
            const dueLabel = card.dueDate
              ? new Date(card.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            return (
              <button
                type="button"
                key={card.id}
                onClick={() => {
                  navigate('/board');
                  openCardDetails(card.id);
                }}
                className="w-full text-left p-3 rounded-lg bg-subtle/60 hover:bg-subtle border border-line hover:border-line-strong transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={card.priority || 'medium'} />
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface text-ink-secondary border border-line">
                      {card.listName}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-ink group-hover:text-brand truncate">
                    {card.title}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {dueLabel && (
                    <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{dueLabel}</span>
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
