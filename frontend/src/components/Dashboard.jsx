import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const { logout } = useAuth();
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrees = async () => {
      try {
        const token = localStorage.getItem('access_token');
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
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrees();
  }, []);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="dashboard-brand">
            <img src="/logo.png" alt="La Racine Logo" className="dashboard-logo" />
            <div>
              <h1 className="dashboard-title">La Racine</h1>
              <p className="dashboard-subtitle">Family Tree Management</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <section className="dashboard-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="action-grid">
            <Link to="/trees/new" className="action-card action-card-primary">
              <div className="action-icon">🌳</div>
              <h3>Create New Tree</h3>
              <p>Start building your family tree</p>
            </Link>
            <Link to="/trees" className="action-card action-card-secondary">
              <div className="action-icon">📋</div>
              <h3>View All Trees</h3>
              <p>Browse your existing family trees</p>
            </Link>
          </div>
        </section>

        {/* Recent Trees */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Your Family Trees</h2>
            <Link to="/trees" className="btn btn-outline btn-sm">
              View All
            </Link>
          </div>
          
          {trees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌳</div>
              <h3 className="empty-state-title">No Family Trees Yet</h3>
              <p className="empty-state-text">
                Create your first family tree to get started
              </p>
              <Link to="/trees/new" className="btn btn-primary">
                Create Your First Tree
              </Link>
            </div>
          ) : (
            <div className="tree-grid">
              {trees.slice(0, 6).map(tree => (
                <div key={tree.id} className="tree-card">
                  <div className="tree-card-header">
                    <h3 className="tree-card-title">{tree.name}</h3>
                    <span className="tree-card-badge">
                      {tree.member_count || 0} members
                    </span>
                  </div>
                  <p className="tree-card-description">
                    {tree.description || 'No description available'}
                  </p>
                  <div className="tree-card-actions">
                    <Link 
                      to={`/tree/${tree.id}`} 
                      className="btn btn-primary btn-sm"
                    >
                      View Tree
                    </Link>
                    <Link 
                      to={`/trees/${tree.id}/members/new`} 
                      className="btn btn-outline btn-sm"
                    >
                      Add Member
                    </Link>
                  </div>
                  <div className="tree-card-footer">
                    <span className="tree-card-date">
                      Created {new Date(tree.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Stats Section */}
        <section className="dashboard-section">
          <h2 className="section-title">Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{trees.length}</div>
              <div className="stat-label">Family Trees</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {trees.reduce((total, tree) => total + (tree.member_count || 0), 0)}
              </div>
              <div className="stat-label">Total Members</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {trees.filter(tree => tree.created_at >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).length}
              </div>
              <div className="stat-label">Recent Trees</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
