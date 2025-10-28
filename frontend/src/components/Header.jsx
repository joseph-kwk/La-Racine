import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null; // Hide header when logged out

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="dashboard-brand">
          <img src="/logo.png" alt="La Racine Logo" className="dashboard-logo" />
          <div>
            <Link to="/dashboard" className="link" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              La Racine
            </Link>
            <p className="dashboard-subtitle">Family Tree Management System</p>
          </div>
        </div>
      </div>
      <div className="header-actions">
        <Link to="/notifications" className="btn btn-outline" style={{ marginRight: '10px' }}>
          🔔 Notifications
        </Link>
        <span className="welcome-text">Welcome, {user?.username}</span>
        <button onClick={handleLogout} className="btn btn-outline">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
