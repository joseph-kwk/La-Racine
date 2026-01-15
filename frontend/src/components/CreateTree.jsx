import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { treeAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const CreateTree = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await treeAPI.createTree({
        name: formData.name,
        description: formData.description
      });

      navigate(`/trees/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create tree');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Navigation Header */}
      <nav className="nav-header">
        <div className="nav-content">
          <div className="nav-brand">
            <h1>🌳 {t('common.laRacine')}</h1>
            <span className="nav-welcome">
              {t('common.welcome')}, {user?.username}!
            </span>
          </div>

          <div className="nav-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              {t('common.back')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2 className="welcome-title">
            ➕ {t('dashboard.createNewTree')}
          </h2>
          <p className="welcome-description">
            {t('dashboard.startNewBranch')}
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                {t('tree.name')} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Smith Family Tree"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your family tree..."
                className="form-input form-textarea"
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
                className="btn btn-primary"
              >
                {isLoading ? 'Creating...' : 'Create Tree'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateTree;
