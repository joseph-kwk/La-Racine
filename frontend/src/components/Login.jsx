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
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary px-4 py-12">
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center mb-6">
          <img src="/logo.png" alt="La Racine Logo" className="login-logo" />
          <h2 className="text-3xl font-extrabold text-gray-900 mt-4">
            {t('auth.signInToAccount')}
          </h2>
        </div>
        <form className="mt-8" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <div className="mb-4">
            <input
              type="text"
              required
              className="form-input"
              placeholder={t('auth.username')}
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
            />
          </div>
          <div className="mb-6">
            <input
              type="password"
              required
              className="form-input"
              placeholder={t('auth.password')}
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            />
          </div>
          <div className="mb-6">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? `🌀 ${t('auth.signingIn')}` : `🚀 ${t('auth.signIn')}`}
            </button>
          </div>
          <div className="text-center">
            <Link to="/register" className="link">
              {t('auth.dontHaveAccount')} ✨ {t('auth.signUp')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
