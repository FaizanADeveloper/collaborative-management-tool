import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  CheckSquare,
  MessageSquare,
  UserPlus,
  Loader2,
} from 'lucide-react';

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'task_assignment':
      return CheckSquare;
    case 'card_comment':
      return MessageSquare;
    case 'workspace_join':
      return UserPlus;
    default:
      return Bell;
  }
};

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const {
    notifications = [],
    unreadCount = 0,
    isLoading = false,
    isDropdownOpen,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setDropdownOpen,
    toggleDropdown,
  } = useNotificationStore();

  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const { openCardDetails } = useUIStore();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const prevOpenRef = useRef(isDropdownOpen);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && !prevOpenRef.current) {
      fetchNotifications({ workspaceId: activeWorkspaceId });
    }
    prevOpenRef.current = isDropdownOpen;
  }, [isDropdownOpen, activeWorkspaceId, fetchNotifications]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen, setDropdownOpen]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, activeTab]);

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.resourceType === 'card' && notification.resourceId) {
      if (notification.workspace && notification.workspace !== activeWorkspaceId) {
        await setActiveWorkspaceId(notification.workspace);
      }
      navigate('/board');
      openCardDetails(notification.resourceId);
      setDropdownOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(activeWorkspaceId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        title="Notifications"
        className="relative p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell className="w-4 h-4 text-ink-secondary" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-danger text-white rounded-full ring-2 ring-canvas select-none shadow-sm animate-in fade-in zoom-in-75 duration-150"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isDropdownOpen && (
        <div
          role="menu"
          aria-label="Notification center"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-elevated border border-line-strong shadow-popover z-50 overflow-hidden flex flex-col max-h-[490px] animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2 bg-canvas/40">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-subtle text-brand border border-brand/25 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-medium text-brand hover:text-brand-hover hover:underline transition-colors focus:outline-none"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="px-4 pt-2 pb-1 border-b border-line flex gap-3 text-xs bg-subtle/30">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-1.5 font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-brand text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink-secondary'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`pb-1.5 font-medium border-b-2 transition-colors ${
                activeTab === 'unread'
                  ? 'border-brand text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink-secondary'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List / Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-line max-h-[350px]">
            {isLoading && notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-ink-muted gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="mx-auto mb-2 w-9 h-9 rounded-lg bg-subtle border border-line flex items-center justify-center text-ink-muted">
                  <Bell className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-ink">
                  {activeTab === 'unread'
                    ? 'No unread notifications'
                    : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5 max-w-[200px] mx-auto">
                  {activeTab === 'unread'
                    ? "You're all caught up with your updates."
                    : 'When you are assigned tasks or mentioned in comments, they will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const IconComponent = getNotificationIcon(n.type);
                const isUnread = !n.isRead;

                return (
                  <div
                    key={n.id}
                    role="menuitem"
                    onClick={() => handleNotificationClick(n)}
                    className={`group relative flex items-start gap-3 p-3 text-left transition-colors cursor-pointer select-none ${
                      isUnread
                        ? 'bg-brand/5 hover:bg-brand/10'
                        : 'bg-elevated hover:bg-subtle'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    <div className="pt-1 flex-shrink-0">
                      {isUnread ? (
                        <span
                          className="block w-2 h-2 rounded-full bg-brand"
                          title="Unread"
                          aria-label="Unread"
                        />
                      ) : (
                        <span className="block w-2 h-2" />
                      )}
                    </div>

                    {/* Icon */}
                    <div
                      className={`p-1.5 rounded-lg border flex-shrink-0 mt-0.5 ${
                        isUnread
                          ? 'bg-surface border-brand/30 text-brand'
                          : 'bg-subtle border-line text-ink-muted'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            isUnread
                              ? 'font-semibold text-ink'
                              : 'font-medium text-ink-secondary'
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-ink-muted whitespace-nowrap flex-shrink-0">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2 mt-0.5 leading-snug break-words">
                        {n.message}
                      </p>
                      {n.actor?.name && (
                        <p className="text-[10px] text-ink-muted/80 mt-1">
                          By <span className="text-ink-secondary font-medium">{n.actor.name}</span>
                        </p>
                      )}
                    </div>

                    {/* Action buttons (hover or mobile) */}
                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => markAsRead(n.id)}
                          title="Mark as read"
                          aria-label="Mark as read"
                          className="p-1 rounded hover:bg-surface text-ink-muted hover:text-ink transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteNotification(n.id)}
                        title="Delete notification"
                        aria-label="Delete notification"
                        className="p-1 rounded hover:bg-danger-subtle text-ink-muted hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
