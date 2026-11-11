import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const variants = {
    default: 'bg-subtle text-ink-secondary border-line',
    primary:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/50',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50',
    danger:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50',
    info:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/50',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[11px] font-medium',
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  const dotColors = {
    default: 'bg-slate-400',
    primary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border select-none ${
        variants[variant] || variants.default
      } ${sizes[size] || sizes.sm} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.default}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  switch (priority) {
    case 'urgent':
      return (
        <Badge variant="danger" dot size="xs">
          Urgent
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="warning" dot size="xs">
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="info" dot size="xs">
          Medium
        </Badge>
      );
    case 'low':
    default:
      return (
        <Badge variant="default" dot size="xs">
          Low
        </Badge>
      );
  }
};

export const RoleBadge = ({ role }) => {
  switch (role) {
    case 'owner':
      return (
        <Badge variant="primary" size="xs">
          Owner
        </Badge>
      );
    case 'admin':
      return (
        <Badge variant="info" size="xs">
          Admin
        </Badge>
      );
    case 'member':
    default:
      return (
        <Badge variant="default" size="xs">
          Member
        </Badge>
      );
  }
};

export const StatusBadge = ({ status }) => {
  switch (status) {
    case 'in_progress':
      return (
        <Badge variant="primary" dot size="xs">
          In Progress
        </Badge>
      );
    case 'in_review':
      return (
        <Badge variant="warning" dot size="xs">
          In Review
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success" dot size="xs">
          Completed
        </Badge>
      );
    case 'todo':
    default:
      return (
        <Badge variant="default" dot size="xs">
          To Do
        </Badge>
      );
  }
};
