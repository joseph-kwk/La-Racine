import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const TreeList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trees, setTrees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/api/trees/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrees(data);
      } else {
        setError('Failed to fetch trees');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTree = async (treeId, treeName) => {
    if (!confirm(`Are you sure you want to delete "${treeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://127.0.0.1:8000/api/trees/${treeId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setTrees(trees.filter(tree => tree.id !== treeId));
      } else {
        setError('Failed to delete tree');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
              Welcome, {user?.username}!
            </span>
          </div>
          
          <div className="nav-actions">
            <Link to="/trees/new" className="btn btn-primary">
              Create New Tree
            </Link>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2 className="welcome-title">
            🌲 Your Family Trees
          </h2>
          <p className="welcome-description">
            Manage and explore your family trees. Click on a tree to view and edit its members.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏳</div>
              <p className="empty-state-text">Loading your family trees...</p>
            </div>
          ) : trees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌱</div>
              <p className="empty-state-text">
                You haven't created any family trees yet.
              </p>
              <Link to="/trees/new" className="btn btn-primary mt-4">
                Create Your First Tree
              </Link>
            </div>
          ) : (
            <div className="tree-list">
              {trees.map(tree => (
                <div key={tree.id} className="tree-card">
                  <div className="tree-card-header">
                    <h3 className="tree-card-title">
                      {tree.name}
                    </h3>
                    <div className="tree-card-actions">
                      <Link 
                        to={`/trees/${tree.id}`} 
                        className="btn btn-primary btn-sm"
                      >
                        View Tree
                      </Link>
                      <button
                        onClick={() => handleDeleteTree(tree.id, tree.name)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {tree.description && (
                    <p className="tree-card-description">
                      {tree.description}
                    </p>
                  )}
                  
                  <div className="tree-card-meta">
                    <span className="tree-card-date">
                      Created: {new Date(tree.created_at).toLocaleDateString()}
                    </span>
                    <span className="tree-card-members">
                      {tree.member_count || 0} members
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TreeList;
