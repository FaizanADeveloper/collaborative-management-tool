import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center ${className}`}
    >
      {Icon && (
        <div className="mx-auto mb-3 w-10 h-10 rounded-lg bg-subtle border border-line flex items-center justify-center text-ink-muted">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
