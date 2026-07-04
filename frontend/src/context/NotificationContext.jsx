/**
 * context/NotificationContext.jsx
 *
 * Provides notification state globally:
 * - unreadCount: shown on the bell icon in Header
 * - notifications: recent notifications list
 * - Auto-polls for unread count every 30 seconds when user is authenticated
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const NotificationContext = createContext({
  unreadCount: 0,
  notifications: [],
  loading: false,
  refresh: () => {},
  markRead: () => {},
  markAllRead: () => {},
});

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [countRes, notifRes] = await Promise.all([
        notificationAPI.getUnreadCount(),
        notificationAPI.getAll({ ordering: '-created_at' }),
      ]);
      setUnreadCount(countRes.data.unread_count ?? 0);
      setNotifications(notifRes.data.results ?? notifRes.data);
    } catch {
      // Silently fail — don't interrupt the app
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Poll every 30 seconds while authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, notifications, loading, refresh, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;
