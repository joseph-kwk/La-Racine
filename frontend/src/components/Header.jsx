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

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <header className="nav-header">
      <div className="nav-content">
        <div className="nav-brand">
          <img src="/logo.png" alt="La Racine Logo" className="dashboard-logo" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Link
              to="/dashboard"
              className="link"
              style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)', textDecoration: 'none', border: 'none' }}
            >
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
            title={theme === 'fresh' ? 'Switch to Cozy Mode' : 'Switch to Fresh Mode'}
          >
            {theme === 'fresh' ? '☀️ Fresh' : '🍂 Cozy'}
          </button>

          {/* Language Selector */}
          <div className="language-selector-wrapper" ref={languageMenuRef}>
            <button
              className="language-selector-btn"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              aria-label={t('language.select')}
              aria-haspopup="listbox"
              aria-expanded={showLanguageMenu}
              id="language-selector-trigger"
            >
              <span className="language-flag" style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                {currentLang.flag}
              </span>
              {/* Show native name in its own script */}
              <span className="language-native-name" style={{ fontSize: '0.82rem', fontWeight: 600, maxWidth: '48px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentLang.nativeName}
              </span>
              <span className="language-chevron" style={{ fontSize: '0.65rem', opacity: 0.5, transition: 'transform 0.2s', display: 'inline-block', transform: showLanguageMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            {showLanguageMenu && (
              <div
                className="language-dropdown"
                role="listbox"
                aria-label={t('language.select')}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'white',
                  padding: '6px',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  minWidth: '160px',
                }}
              >
                {languages.map((lang) => {
                  const isActive = currentLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      role="option"
                      aria-selected={isActive}
                      className={`language-option ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        border: 'none',
                        background: isActive ? 'var(--primary-light, #d1fae5)' : 'transparent',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{lang.flag}</span>
                      {/* Native name in its own script */}
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--primary-dark)' : 'var(--gray-700)',
                        flex: 1,
                      }}>
                        {lang.nativeName}
                      </span>
                      {isActive && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-green)' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="btn btn-logout"
            style={{ background: 'white', color: 'var(--primary-dark)', borderColor: 'var(--gray-200)', position: 'relative' }}
            aria-label={`${t('header.notifications')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          >
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
