import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageMenu]);

  if (!isAuthenticated) return null; // Hide header when logged out

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="nav-header">
      <div className="nav-content">
        <div className="nav-brand">
          <img src="/logo.png" alt="La Racine Logo" className="dashboard-logo" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Link to="/dashboard" className="link" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)', textDecoration: 'none', border: 'none' }}>
              {t('common.laRacine')}
            </Link>
            <span className="dashboard-subtitle">{t('header.familyTreeManagement')}</span>
          </div>
        </div>
        <div className="header-actions">
          {/* Theme Toggle */}
          <button
            className="btn btn-logout"
            onClick={toggleTheme}
            style={{ marginRight: '10px', background: 'transparent', border: '1px solid var(--gray-300)', padding: '6px 12px' }}
            title={theme === 'fresh' ? "Switch to Cozy Mode" : "Switch to Fresh Mode"}
          >
            {theme === 'fresh' ? '☀️ Fresh' : '🍂 Cozy'}
          </button>

          {/* Language Selector */}
          <div className="language-selector-wrapper" ref={languageMenuRef}>
            <button
              className="language-selector-btn"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              aria-label="Select language"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="language-flag" style={{ fontSize: '1.4rem', lineHeight: '1', display: 'flex', alignItems: 'center' }}>
                {languages.find(l => l.code === currentLanguage)?.flag || '🌐'}
              </span>
              <span className="language-code" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentLanguage.toUpperCase()}</span>
            </button>
            {showLanguageMenu && (
              <div className="language-dropdown" style={{ position: 'absolute', top: '100%', right: 0, background: 'white', padding: '8px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(0,0,0,0.05)' }}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`language-option ${currentLanguage === lang.code ? 'active' : ''}`}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: 'none', background: currentLanguage === lang.code ? 'var(--gray-50)' : 'transparent', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                  >
                    <span className="language-flag">{lang.flag}</span>
                    <span className="language-name" style={{ fontSize: '0.9rem' }}>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link to="/notifications" className="btn btn-logout" style={{ background: 'white', color: 'var(--primary-dark)', borderColor: 'var(--gray-200)', position: 'relative' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: '#ef4444', color: 'white', borderRadius: '50%',
                fontSize: '0.65rem', fontWeight: 700,
                width: '18px', height: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          <div className="nav-welcome">
            <span>👋</span>
            <Link to="/account" style={{ fontWeight: 500, color: 'var(--primary-dark)', textDecoration: 'none' }}>
              {user?.username}
            </Link>
          </div>
          <button onClick={handleLogout} className="btn btn-logout">
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
