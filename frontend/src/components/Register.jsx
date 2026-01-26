import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const { t } = useTranslation();
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: ''
  });
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
      navigate('/login');
    } else {
      // Better error handling to show more specific error messages
      let errorMessage = 'Registration failed';

      if (result.error) {
        if (result.error.username) {
          errorMessage = `Username: ${result.error.username[0]}`;
        } else if (result.error.email) {
          errorMessage = `Email: ${result.error.email[0]}`;
        } else if (result.error.password) {
          errorMessage = `Password: ${result.error.password[0]}`;
        } else if (result.error.non_field_errors) {
          errorMessage = result.error.non_field_errors[0];
        } else if (result.error.detail) {
          errorMessage = result.error.detail;
        } else if (typeof result.error === 'string') {
          errorMessage = result.error;
        }
      }

      setError(errorMessage);
      console.error('Registration error:', result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center dashboard-container px-4 py-12">
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center mb-6">
          <img src="/logo.png" alt="La Racine Logo" style={{ height: '80px', marginBottom: '1rem' }} />
          <h2 className="welcome-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            {t('auth.createAccount')}
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
              value={userData.username}
              onChange={(e) => setUserData({ ...userData, username: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder={t('auth.email')}
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">{t('auth.password')}</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder={t('auth.password')}
              value={userData.password}
              onChange={(e) => setUserData({ ...userData, password: e.target.value })}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? `🌀 ${t('common.loading')}` : `🚀 ${t('auth.createAccount')}`}
            </button>
          </div>
          <div className="text-center mt-6">
            <Link to="/login" className="link font-medium">
              {t('auth.alreadyHaveAccount')} <span style={{ fontWeight: 'bold' }}>{t('auth.signIn')}</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
