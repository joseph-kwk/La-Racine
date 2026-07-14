import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(credentials);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error?.detail || t('auth.loginFailed'));
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <img src="/logo.png" alt="La Racine Logo" className="auth-logo" />
          <h1 className="auth-title">{t('auth.signInToAccount')}</h1>
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
            <label className="form-label" htmlFor="login-username">
              {t('auth.username')}
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              className="form-input"
              placeholder={t('auth.username')}
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              {t('auth.password')}
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              className="form-input"
              placeholder={t('auth.password')}
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary auth-submit-btn"
          >
            {loading ? (
              <span className="auth-loading-inner">
                <span className="btn-spinner" />
                {t('auth.signingIn')}
              </span>
            ) : t('auth.signIn')}
          </button>

          <p className="auth-switch">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/register" className="link auth-switch__link">
              {t('auth.signUp')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
