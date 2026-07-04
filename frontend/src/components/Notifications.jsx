/**
 * components/Notifications.jsx — Full Notifications page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const TYPE_ICONS = {
  birthday_reminder: '🎂',
  change_needs_review: '📝',
  change_approved: '✅',
  change_rejected: '❌',
  new_member_added: '👤',
  photo_tagged: '📸',
  tree_invitation: '🔗',
  welcome: '👋',
  system: '📢',
};

function NotificationItem({ notification, onMarkRead }) {
  const icon = TYPE_ICONS[notification.event_type] || '🔔';
  const timeStr = new Date(notification.created_at).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className={`notification-item ${notification.is_read ? 'notification-item--read' : 'notification-item--unread'}`}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      <div className="notification-item__icon">{icon}</div>
      <div className="notification-item__body">
        <p className="notification-item__title">{notification.title}</p>
        <p className="notification-item__text">{notification.body}</p>
        {notification.related_member_name && (
          <p className="notification-item__meta">
            👤 {notification.related_member_name}
            {notification.related_tree_name && ` · 🌳 ${notification.related_tree_name}`}
          </p>
        )}
        <span className="notification-item__time">{timeStr}</span>
      </div>
      {notification.action_url && (
        <Link
          to={notification.action_url}
          className="notification-item__action"
          onClick={(e) => e.stopPropagation()}
        >
          View →
        </Link>
      )}
    </div>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } = useNotifications();

  return (
    <div className="notifications-page">
      <div className="notifications-page__header">
        <div>
          <h1 className="notifications-page__title">
            🔔 Notifications
            {unreadCount > 0 && (
              <span className="notifications-page__badge">{unreadCount}</span>
            )}
          </h1>
          <p className="notifications-page__subtitle">Stay up to date with your family tree</p>
        </div>
        <div className="notifications-page__actions">
          {unreadCount > 0 && (
            <button className="btn btn--ghost" onClick={markAllRead}>
              ✓ Mark all read
            </button>
          )}
          <button className="btn btn--ghost" onClick={refresh} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      <div className="notifications-page__list">
        {notifications.length === 0 ? (
          <div className="notifications-page__empty">
            <div className="notifications-page__empty-icon">🔔</div>
            <p>You're all caught up!</p>
            <p className="notifications-page__empty-sub">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
          ))
        )}
      </div>
    </div>
  );
}