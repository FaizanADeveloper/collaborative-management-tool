import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
}) => {
  const tealStyle = 'bg-brand-subtle text-brand border-brand/25';
  const slateStyle = 'bg-info-subtle text-info border-info/25';
  const successStyle = 'bg-success-subtle text-success border-success/25';
  const warningStyle = 'bg-warning-subtle text-warning border-warning/25';
  const dangerStyle = 'bg-danger-subtle text-danger border-danger/25';

  const colorMaps = {
    teal: tealStyle,
    indigo: tealStyle,
    slate: slateStyle,
    sky: slateStyle,
    success: successStyle,
    emerald: successStyle,
    warning: warningStyle,
    amber: warningStyle,
    danger: dangerStyle,
    rose: dangerStyle,
  };

  const iconStyle = colorMaps[color] || tealStyle;

  return (
    <div className="rounded-xl bg-surface border border-line p-5 shadow-card transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider block">
            {title}
          </span>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight tabular-nums">
              {value}
            </span>
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-ink-secondary truncate">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-lg border flex-shrink-0 ${iconStyle}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};
