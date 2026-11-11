import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, CheckCheck, Trash2, ArrowUpRight, MessageSquare, AlertCircle, Award, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationsDropdown = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'mention':
        return <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />;
      case 'milestone':
        return <Award className="w-3.5 h-3.5 text-amber-400" />;
      case 'security':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'assignment':
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
    }
    onClose();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold rounded-full border border-indigo-500/30">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors p-1"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p>All caught up!</p>
            <p className="text-xs text-slate-600 mt-0.5">No notifications right now.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 flex items-start gap-3 hover:bg-slate-800/60 cursor-pointer transition-colors ${
                !notif.read ? 'bg-indigo-950/20' : ''
              }`}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700/60 flex-shrink-0">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs ${!notif.read ? 'font-semibold text-slate-100' : 'font-medium text-slate-300'}`}>
                    {notif.title}
                  </p>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  {notif.message}
                </p>
              </div>

              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 text-center">
          <span className="text-[11px] text-slate-500">
            Real-time notifications enabled
          </span>
        </div>
      )}
    </div>
  );
};

