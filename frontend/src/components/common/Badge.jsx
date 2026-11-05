import React from 'react';

export const Badge = ({
  children,
  variant = 'default', // 'default', 'primary', 'success', 'warning', 'danger', 'info', 'neutral'
  size = 'sm', // 'xs', 'sm', 'md'
  dot = false,
  className = '',
}) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700/60',
    primary: 'bg-indigo-950/60 text-indigo-300 border-indigo-700/40',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-700/40',
    danger: 'bg-rose-950/60 text-rose-300 border-rose-700/40',
    info: 'bg-sky-950/60 text-sky-300 border-sky-700/40',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-700/40',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px] font-mono tracking-tight',
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  const dotColors = {
    default: 'bg-slate-400',
    primary: 'bg-indigo-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
    purple: 'bg-purple-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border font-medium select-none ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.default}`} />
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

