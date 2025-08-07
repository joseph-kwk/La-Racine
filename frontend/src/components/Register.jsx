import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
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
      setError(result.error.username?.[0] || result.error.email?.[0] || 'Registration failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary px-4 py-12">
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-6 mt-6">
            🌳 Create your La Racine account
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
              placeholder="Username"
              value={userData.username}
              onChange={(e) => setUserData({...userData, username: e.target.value})}
            />
          </div>
          <div className="mb-4">
            <input
              type="email"
              required
              className="form-input"
              placeholder="Email address"
              value={userData.email}
              onChange={(e) => setUserData({...userData, email: e.target.value})}
            />
          </div>
          <div className="mb-6">
            <input
              type="password"
              required
              className="form-input"
              placeholder="Password"
              value={userData.password}
              onChange={(e) => setUserData({...userData, password: e.target.value})}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
          <div className="text-center mt-6">
            <Link to="/login" className="font-medium text-primary-purple hover:text-secondary-purple">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
