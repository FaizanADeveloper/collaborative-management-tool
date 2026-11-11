import React from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { Layers } from 'lucide-react';

const PRIORITY_BUCKETS = [
  { key: 'urgent', label: 'Urgent', barClass: 'bg-danger', dotClass: 'bg-danger' },
  { key: 'high', label: 'High', barClass: 'bg-warning', dotClass: 'bg-warning' },
  { key: 'medium', label: 'Medium', barClass: 'bg-info', dotClass: 'bg-info' },
  { key: 'low', label: 'Low', barClass: 'bg-ink-muted', dotClass: 'bg-ink-muted' },
];

export const TaskDistributionChart = () => {
  const { cardsByList, activeBoard } = useBoardStore();
  const cards = Object.values(cardsByList).flat();
  const total = cards.length;

  return (
    <div className="rounded-xl bg-surface border border-line p-5 shadow-card flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <span>Priority Breakdown</span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            {activeBoard ? `Cards on ${activeBoard.name}` : 'Select a board to view breakdown'}
          </p>
        </div>
        <span className="text-xs font-mono font-medium tabular-nums text-ink-secondary px-2 py-0.5 rounded-md bg-subtle border border-line">
          {total} {total === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-ink-muted py-8 text-center">
          No cards on the active board yet.
        </p>
      ) : (
        <div className="space-y-3">
          {PRIORITY_BUCKETS.map((bucket) => {
            const count = cards.filter((c) => (c.priority || 'medium') === bucket.key).length;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={bucket.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${bucket.dotClass}`} />
                    <span className="font-medium text-ink-secondary">{bucket.label}</span>
                  </div>
                  <span className="font-mono text-ink-muted">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-subtle overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${bucket.barClass}`}
                    style={{ width: `${pct}%` }}
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
