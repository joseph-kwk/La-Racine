import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const { t } = useTranslation();
  const [userData, setUserData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(userData);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      let errorMessage = t('auth.registrationFailed');
      if (result.error) {
        if (result.error.username) errorMessage = `Username: ${result.error.username[0]}`;
        else if (result.error.email) errorMessage = `Email: ${result.error.email[0]}`;
        else if (result.error.password) errorMessage = `Password: ${result.error.password[0]}`;
        else if (result.error.non_field_errors) errorMessage = result.error.non_field_errors[0];
        else if (result.error.detail) errorMessage = result.error.detail;
        else if (typeof result.error === 'string') errorMessage = result.error;
      }
      setError(errorMessage);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <img src="/logo.png" alt="La Racine Logo" className="auth-logo" />
          <h1 className="auth-title">{t('auth.createAccount')}</h1>
          <p className="auth-subtitle">{t('common.laRacine')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <div className="auth-error" role="alert">
              <span className="auth-error__icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">
              {t('auth.username')}
            </label>
            <input
              id="reg-username"
              type="text"
              required
              autoComplete="username"
              className="form-input"
              placeholder={t('auth.username')}
              value={userData.username}
              onChange={(e) => setUserData({ ...userData, username: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              {t('auth.email')}
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              className="form-input"
              placeholder={t('auth.email')}
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              {t('auth.password')}
            </label>
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
              className="form-input"
              placeholder={t('auth.password')}
              value={userData.password}
              onChange={(e) => setUserData({ ...userData, password: e.target.value })}
            />
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary auth-submit-btn"
          >
            {loading ? (
              <span className="auth-loading-inner">
                <span className="btn-spinner" />
                {t('common.loading')}
              </span>
            ) : t('auth.createAccount')}
          </button>

          <p className="auth-switch">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="link auth-switch__link">
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
