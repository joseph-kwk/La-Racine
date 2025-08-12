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
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary px-4 py-12">
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center mb-6">
          <img src="/logo.png" alt="La Racine Logo" className="login-logo" />
          <h2 className="text-3xl font-extrabold text-gray-900 mt-4">
            Create your La Racine account
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
            <Link to="/login" className="link font-medium">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
