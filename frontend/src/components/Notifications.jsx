/**
 * components/Notifications.jsx — Full Notifications page
 * Fixed: full i18n via useTranslation, CSS spinner instead of emoji
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../context/NotificationContext';

const TYPE_ICONS = {
  birthday_reminder:  '🎂',
  change_needs_review:'📝',
  change_approved:    '✅',
  change_rejected:    '❌',
  new_member_added:   '👤',
  photo_tagged:       '📸',
  tree_invitation:    '🔗',
  welcome:            '👋',
  system:             '📢',
};

function NotificationItem({ notification, onMarkRead }) {
  const { t } = useTranslation();
  const icon = TYPE_ICONS[notification.event_type] || '🔔';
  const timeStr = new Date(notification.created_at).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className={`notification-item ${notification.is_read ? 'notification-item--read' : 'notification-item--unread'}`}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
      role={notification.is_read ? 'listitem' : 'button'}
      tabIndex={notification.is_read ? undefined : 0}
      onKeyDown={e => e.key === 'Enter' && !notification.is_read && onMarkRead(notification.id)}
      aria-label={notification.is_read ? undefined : t('notifications.markRead')}
    >
      <div className="notification-item__icon" aria-hidden="true">{icon}</div>
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
          onClick={e => e.stopPropagation()}
        >
          {t('common.view')} →
        </Link>
      )}
    </div>
  );
}

export default function Notifications() {
  const { t } = useTranslation();
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } = useNotifications();

  return (
    <div className="notifications-page">
      <div className="notifications-page__header">
        <div>
          <h1 className="notifications-page__title">
            🔔 {t('nav.notifications')}
            {unreadCount > 0 && (
              <span className="notifications-page__badge" aria-label={`${unreadCount} ${t('notifications.unread')}`}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="notifications-page__subtitle">{t('notifications.subtitle')}</p>
        </div>
        <div className="notifications-page__actions">
          {unreadCount > 0 && (
            <button className="btn btn--ghost" onClick={markAllRead}>
              ✓ {t('notifications.markAllRead')}
            </button>
          )}
          <button className="btn btn--ghost" onClick={refresh} disabled={loading} aria-label={t('common.refresh')}>
            {loading ? <span className="btn-spinner" style={{ borderTopColor: 'var(--gray-500)', borderColor: 'var(--gray-200)' }} /> : '🔄'} {t('common.refresh')}
          </button>
        </div>
      </div>

      <div className="notifications-page__list" role="list" aria-label={t('nav.notifications')}>
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p>{t('messages.loadingData')}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-page__empty">
            <div className="notifications-page__empty-icon">🔔</div>
            <p>{t('notifications.allCaughtUp')}</p>
            <p className="notifications-page__empty-sub">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
          ))
        )}
      </div>
    </div>
  );
}