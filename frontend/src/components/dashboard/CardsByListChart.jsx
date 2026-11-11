import React from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { Columns3 } from 'lucide-react';

export const CardsByListChart = () => {
  const { lists, cardsByList, activeBoard } = useBoardStore();
  const counts = lists.map((list) => ({
    id: list.id,
    name: list.name,
    count: (cardsByList[list.id] || []).length,
  }));
  const maxCount = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="rounded-xl bg-surface border border-line p-5 shadow-card flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Columns3 className="w-4 h-4 text-brand" />
            <span>Cards by List</span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            {activeBoard ? `List distribution in ${activeBoard.name}` : 'No active board selected'}
          </p>
        </div>
        <span className="text-xs font-mono font-medium tabular-nums text-ink-secondary px-2 py-0.5 rounded-md bg-subtle border border-line">
          {lists.length} {lists.length === 1 ? 'list' : 'lists'}
        </span>
      </div>

      {lists.length === 0 ? (
        <p className="text-xs text-ink-muted py-8 text-center">
          Add lists on your active board to visualize workflow volume.
        </p>
      ) : (
        <div className="space-y-3">
          {counts.map((item) => {
            const widthPct = item.count === 0 ? 0 : Math.round((item.count / maxCount) * 100);
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-secondary truncate">{item.name}</span>
                  <span className="font-mono text-ink-muted">{item.count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
