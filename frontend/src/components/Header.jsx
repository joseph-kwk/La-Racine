import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
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
    <header className="dashboard-header">
      <div className="header-content">
        <div className="dashboard-brand">
          <img src="/logo.png" alt="La Racine Logo" className="dashboard-logo" />
          <div>
            <Link to="/dashboard" className="link" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {t('common.laRacine')}
            </Link>
            <p className="dashboard-subtitle">{t('header.familyTreeManagement')}</p>
          </div>
        </div>
      </div>
      <div className="header-actions">
        {/* Language Selector */}
        <div className="language-selector-wrapper" ref={languageMenuRef}>
          <button 
            className="language-selector-btn"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            aria-label="Select language"
          >
            <span className="language-flag">
              {languages.find(l => l.code === currentLanguage)?.flag || '🌐'}
            </span>
            <span className="language-code">{currentLanguage.toUpperCase()}</span>
            <span className="language-arrow">▼</span>
          </button>
          {showLanguageMenu && (
            <div className="language-dropdown">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`language-option ${currentLanguage === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                >
                  <span className="language-flag">{lang.flag}</span>
                  <span className="language-name">{lang.name}</span>
                  {currentLanguage === lang.code && <span className="language-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <Link to="/notifications" className="btn btn-outline" style={{ marginRight: '10px' }}>
          🔔 {t('header.notifications')}
        </Link>
        <span className="welcome-text">{t('header.welcome')}, {user?.username}</span>
        <button onClick={handleLogout} className="btn btn-outline">
          {t('auth.logout')}
        </button>
      </div>
    </header>
  );
};

export default Header;
