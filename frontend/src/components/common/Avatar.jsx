import React from 'react';

export const Avatar = ({
  user,
  name,
  src,
  initials,
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl'
  status, // 'online', 'away', 'offline'
  className = '',
  ring = true,
}) => {
  const displayName = user?.name || name || 'User';
  const displaySrc = user?.avatar || src;
  const displayInitials = user?.initials || initials || displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const displayStatus = user?.status || status;

  const sizes = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-base',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5 ring-[1px]',
    sm: 'w-2 h-2 ring-[1.5px]',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-3.5 h-3.5 ring-2',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    away: 'bg-amber-500',
    offline: 'bg-slate-500',
  };

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={displayName}
          className={`${sizes[size] || sizes.md} rounded-full object-cover ${ring ? 'ring-2 ring-slate-800' : ''}`}
        />
      ) : (
        <div className={`${sizes[size] || sizes.md} rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white font-semibold flex items-center justify-center select-none ${ring ? 'ring-2 ring-slate-800' : ''}`}>
          {displayInitials}
        </div>
      )}

      {displayStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-slate-900 ${statusSizes[size] || statusSizes.md} ${statusColors[displayStatus] || statusColors.offline}`}
          title={`${displayName} is ${displayStatus}`}
        />
      )}
    </div>
  );
};

export const AvatarGroup = ({ users = [], max = 4, size = 'sm', className = '' }) => {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  return (
    <div className={`flex items-center -space-x-2 overflow-hidden ${className}`}>
      {visible.map((user, idx) => (
        <Avatar
          key={user.id || idx}
          user={user}
          size={size}
          className="hover:z-10 transition-transform hover:scale-105"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeClasses[size] || sizeClasses.sm} rounded-full bg-slate-800 text-slate-300 ring-2 ring-slate-900 font-medium flex items-center justify-center text-xs select-none z-0`}
          title={`${remaining} more members`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

