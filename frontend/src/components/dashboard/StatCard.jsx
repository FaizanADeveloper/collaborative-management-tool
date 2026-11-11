import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
}) => {
  const colorMaps = {
    indigo: 'bg-brand-subtle text-brand border-brand/20',
    emerald:
      'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/40',
    amber:
      'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/40',
    sky:
      'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800/40',
    rose:
      'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/40',
  };

  const iconStyle = colorMaps[color] || colorMaps.indigo;

  return (
    <div className="rounded-xl bg-surface border border-line p-5 shadow-sm transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider block">
            {title}
          </span>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
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
          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${iconStyle}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};
