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
    primary: 'bg-brand-subtle text-brand border-brand/25',
    success: 'bg-success-subtle text-success border-success/25',
    warning: 'bg-warning-subtle text-warning border-warning/25',
    danger: 'bg-danger-subtle text-danger border-danger/25',
    info: 'bg-info-subtle text-info border-info/25',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[11px] font-medium',
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  const dotColors = {
    default: 'bg-ink-muted',
    primary: 'bg-brand',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
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
