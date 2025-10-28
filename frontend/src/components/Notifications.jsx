import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://127.0.0.1:8000/api/notifications/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        } else {
          setError('Failed to load notifications');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    // For now, just remove from list (in future, add read status)
    setNotifications(notifications.filter(n => n.id !== notificationId));
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <p className="empty-state-text">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="nav-header">
        <div className="nav-content">
          <div className="nav-brand">
            <h1>🔔 Notifications</h1>
            <span className="nav-welcome">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="nav-actions">
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2 className="welcome-title">Your Family Notifications</h2>

          {notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              <p className="empty-state-text">
                No notifications yet. Add family members to start receiving updates!
              </p>
              <Link to="/trees" className="btn btn-primary mt-4">
                View Trees
              </Link>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map(notification => (
                <div key={notification.id} className="notification-card">
                  <div className="notification-header">
                    <div className="notification-type">
                      {notification.type === 'Birthday' && '🎂'}
                      {notification.type === 'Death' && '🕊️'}
                      {notification.type === 'Addition' && '👶'}
                      {notification.type}
                    </div>
                    <div className="notification-date">
                      {new Date(notification.event_date).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="btn btn-sm btn-danger"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="notification-content">
                    <strong>{notification.related_member.first_name} {notification.related_member.last_name}</strong>
                    {notification.type === 'Birthday' && ' celebrates a birthday today!'}
                    {notification.type === 'Death' && ' has passed away.'}
                    {notification.type === 'Addition' && ' has been added to your family tree.'}
                  </div>
                  <div className="notification-actions">
                    <Link
                      to={`/trees/${notification.related_member.tree}`}
                      className="btn btn-primary btn-sm"
                    >
                      View Tree
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;