import React, { useState } from 'react';

export const Avatar = ({
  user,
  name,
  src,
  initials,
  size = 'md',
  className = '',
  ring = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const displayName = user?.name || name || 'User';
  const displaySrc = !imgError ? user?.avatar || src : '';
  const computedInitials =
    user?.initials ||
    initials ||
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'U';

  const sizes = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-base',
  };

  const ringClass = ring ? 'ring-2 ring-surface' : '';

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={displayName}
          onError={() => setImgError(true)}
          className={`${sizes[size] || sizes.md} rounded-full object-cover ${ringClass}`}
        />
      ) : (
        <div
          aria-label={displayName}
          className={`${sizes[size] || sizes.md} rounded-full bg-brand text-white font-semibold flex items-center justify-center select-none ${ringClass}`}
        >
          {computedInitials}
        </div>
      )}
    </div>
  );
};

export const AvatarGroup = ({ users = [], max = 3, size = 'xs', className = '' }) => {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  return (
    <div className={`flex items-center -space-x-1.5 ${className}`}>
      {visible.map((user, idx) => (
        <Avatar
          key={user.id || user._id || idx}
          user={typeof user === 'string' ? { name: 'Member' } : user}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeClasses[size] || sizeClasses.xs} rounded-full bg-subtle text-ink-secondary border border-line ring-2 ring-surface font-medium flex items-center justify-center select-none`}
          title={`${remaining} more`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
