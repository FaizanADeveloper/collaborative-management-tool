import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-subtle ${className}`}
    />
  );
};

export const BoardSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {[1, 2, 3].map((col) => (
      <div
        key={col}
        className="w-80 flex-shrink-0 rounded-xl bg-surface border border-line p-3 space-y-3"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);
