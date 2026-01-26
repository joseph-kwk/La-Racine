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
      setError(result.error.detail || t('auth.loginFailed'));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center dashboard-container px-4 py-12">
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center mb-6">
          <img src="/logo.png" alt="La Racine Logo" style={{ height: '80px', marginBottom: '1rem' }} />
          <h2 className="welcome-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            {t('auth.signInToAccount')}
          </h2>
          <p className="text-gray-600">{t('common.laRacine')}</p>
        </div>
        <form className="mt-8" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t('auth.username')}</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder={t('auth.username')}
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">{t('auth.password')}</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder={t('auth.password')}
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
          </div>
          <div className="mb-6">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? `🌀 ${t('auth.signingIn')}` : `🚀 ${t('auth.signIn')}`}
            </button>
          </div>
          <div className="text-center mt-4">
            <Link to="/register" className="link">
              {t('auth.dontHaveAccount')} <span style={{ fontWeight: 'bold' }}>{t('auth.signUp')}</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
