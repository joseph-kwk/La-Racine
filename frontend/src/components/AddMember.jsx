import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AddMember = () => {
  const { treeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    birth_date: '',
    death_date: '',
    relationship: '',
    notes: ''
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
      const token = localStorage.getItem('token');
      
      // Prepare data (remove empty values)
      const memberData = {
        tree: parseInt(treeId),
        first_name: formData.first_name,
        last_name: formData.last_name
      };

      if (formData.gender) memberData.gender = formData.gender;
      if (formData.birth_date) memberData.birth_date = formData.birth_date;
      if (formData.death_date) memberData.death_date = formData.death_date;
      if (formData.relationship) memberData.relationship = formData.relationship;
      if (formData.notes) memberData.notes = formData.notes;

      const response = await fetch('http://127.0.0.1:8000/api/members/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(memberData)
      });

      if (response.ok) {
        navigate(`/trees/${treeId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to add member');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
            <h1>🌳 La Racine</h1>
            <span className="nav-welcome">
              Add Family Member
            </span>
          </div>
          
          <div className="nav-actions">
            <button onClick={() => navigate(`/trees/${treeId}`)} className="btn btn-secondary">
              Back to Tree
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2 className="welcome-title">
            👤 Add Family Member
          </h2>
          <p className="welcome-description">
            Add a new member to your family tree with their basic information.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name" className="form-label">
                  First Name *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name" className="form-label">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gender" className="form-label">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="relationship" className="form-label">
                  Relationship
                </label>
                <input
                  type="text"
                  id="relationship"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
                  placeholder="e.g., Father, Mother, Son, Daughter"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="birth_date" className="form-label">
                  Birth Date
                </label>
                <input
                  type="date"
                  id="birth_date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="death_date" className="form-label">
                  Death Date
                </label>
                <input
                  type="date"
                  id="death_date"
                  name="death_date"
                  value={formData.death_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes" className="form-label">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any additional information about this family member..."
                className="form-input form-textarea"
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(`/trees/${treeId}`)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.first_name.trim() || !formData.last_name.trim()}
                className="btn btn-primary"
              >
                {isLoading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddMember;
