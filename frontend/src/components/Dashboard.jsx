import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [selectedTreeType, setSelectedTreeType] = useState('all');

  // Tree type definitions for enhanced categorization
  const treeTypeOptions = [
    { value: 'all', label: 'All Trees', icon: '🌳', description: 'View all family trees' },
    { value: 'primary', label: 'Primary Family', icon: '🏠', description: 'Main nuclear family' },
    { value: 'maternal', label: 'Maternal Line', icon: '👩', description: "Mother's side ancestry" },
    { value: 'paternal', label: 'Paternal Line', icon: '👨', description: "Father's side ancestry" },
    { value: 'extended', label: 'Extended Family', icon: '👨‍👩‍👧‍👦', description: 'Cousins, aunts, uncles' },
    { value: 'adopted', label: 'Adopted Family', icon: '💝', description: 'Adopted family connections' },
    { value: 'step', label: 'Step Family', icon: '👫', description: 'Step-parent family lines' },
  ];

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
          // Enhance trees with mock additional data for demonstration
          const enhancedTrees = data.map(tree => ({
            ...tree,
            tree_type: tree.tree_type || 'primary',
            member_count: tree.member_count || Math.floor(Math.random() * 50) + 5,
            role: 'owner', // This would come from the API
            last_updated: tree.updated_at || tree.created_at,
            relationship_count: Math.floor(Math.random() * 100) + 10
          }));
          setTrees(enhancedTrees);
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

  const filteredTrees = selectedTreeType === 'all' 
    ? trees 
    : trees.filter(tree => tree.tree_type === selectedTreeType);

  const getRoleIcon = (role) => {
    switch(role) {
      case 'owner': return '👑';
      case 'editor': return '✏️';
      case 'viewer': return '👁️';
      default: return '👤';
    }
  };

  const getRoleBadgeClass = (role) => {
    return `role-badge role-${role}`;
  };

  const getTreeTypeIcon = (type) => {
    const option = treeTypeOptions.find(opt => opt.value === type);
    return option ? option.icon : '🌳';
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
      {/* Enhanced Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="dashboard-brand">
            <img src="/logo.png" alt="La Racine Logo" className="dashboard-logo" />
            <div>
              <h1 className="dashboard-title">La Racine</h1>
              <p className="dashboard-subtitle">Family Tree Management System</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <span className="welcome-text">Welcome, {user?.username}</span>
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-tab ${activeView === 'trees' ? 'active' : ''}`}
          onClick={() => setActiveView('trees')}
        >
          🌳 Family Trees
        </button>
        <button 
          className={`nav-tab ${activeView === 'members' ? 'active' : ''}`}
          onClick={() => setActiveView('members')}
        >
          👥 Members
        </button>
        <button 
          className={`nav-tab ${activeView === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveView('updates')}
        >
          📰 Updates
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="overview-content">
            {/* Enhanced Statistics */}
            <section className="dashboard-section">
              <h2 className="section-title">Family Statistics</h2>
              <div className="stats-grid enhanced-stats">
                <div className="stat-card stat-primary">
                  <div className="stat-icon">🌳</div>
                  <div className="stat-content">
                    <div className="stat-number">{trees.length}</div>
                    <div className="stat-label">Family Trees</div>
                  </div>
                </div>
                <div className="stat-card stat-secondary">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {trees.reduce((total, tree) => total + (tree.member_count || 0), 0)}
                    </div>
                    <div className="stat-label">Total Members</div>
                  </div>
                </div>
                <div className="stat-card stat-accent">
                  <div className="stat-icon">👑</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {trees.filter(tree => tree.role === 'owner').length}
                    </div>
                    <div className="stat-label">Trees Owned</div>
                  </div>
                </div>
                <div className="stat-card stat-info">
                  <div className="stat-icon">🔗</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {trees.reduce((total, tree) => total + (tree.relationship_count || 0), 0)}
                    </div>
                    <div className="stat-label">Relationships</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="dashboard-section">
              <h2 className="section-title">Quick Actions</h2>
              <div className="action-grid enhanced-actions">
                <Link to="/trees/new" className="action-card action-card-primary">
                  <div className="action-icon">🌳</div>
                  <h3>Create New Tree</h3>
                  <p>Start a new family tree branch</p>
                </Link>
                <div className="action-card action-card-secondary" onClick={() => setActiveView('trees')}>
                  <div className="action-icon">👥</div>
                  <h3>Add Family Member</h3>
                  <p>Add relatives to existing trees</p>
                </div>
                <div className="action-card action-card-accent" onClick={() => setActiveView('updates')}>
                  <div className="action-icon">📸</div>
                  <h3>Share Update</h3>
                  <p>Post family news and photos</p>
                </div>
                <Link to="/trees" className="action-card action-card-info">
                  <div className="action-icon">📊</div>
                  <h3>View Analytics</h3>
                  <p>Family insights and patterns</p>
                </Link>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="dashboard-section">
              <h2 className="section-title">Recent Activity</h2>
              <div className="activity-feed">
                <div className="activity-item">
                  <div className="activity-icon">👶</div>
                  <div className="activity-content">
                    <p><strong>New member added:</strong> Baby Emma to Smith Family Tree</p>
                    <span className="activity-time">2 hours ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">📸</div>
                  <div className="activity-content">
                    <p><strong>Photo uploaded:</strong> Family reunion 2025</p>
                    <span className="activity-time">1 day ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">🎂</div>
                  <div className="activity-content">
                    <p><strong>Upcoming birthday:</strong> Uncle John turns 70</p>
                    <span className="activity-time">3 days from now</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Trees Tab */}
        {activeView === 'trees' && (
          <div className="trees-content">
            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Your Family Trees</h2>
                <Link to="/trees/new" className="btn btn-primary">
                  + Create New Tree
                </Link>
              </div>

              {/* Tree Type Filter */}
              <div className="tree-type-filter">
                {treeTypeOptions.map(option => (
                  <button
                    key={option.value}
                    className={`tree-type-btn ${selectedTreeType === option.value ? 'active' : ''}`}
                    onClick={() => setSelectedTreeType(option.value)}
                    title={option.description}
                  >
                    <span className="tree-type-icon">{option.icon}</span>
                    <span className="tree-type-label">{option.label}</span>
                    <span className="tree-type-count">
                      ({option.value === 'all' ? trees.length : trees.filter(t => t.tree_type === option.value).length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Trees Grid */}
              {filteredTrees.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🌳</div>
                  <h3 className="empty-state-title">
                    {selectedTreeType === 'all' ? 'No Family Trees Yet' : `No ${treeTypeOptions.find(opt => opt.value === selectedTreeType)?.label} Trees`}
                  </h3>
                  <p className="empty-state-text">
                    {selectedTreeType === 'all' 
                      ? 'Create your first family tree to get started'
                      : `Create a ${treeTypeOptions.find(opt => opt.value === selectedTreeType)?.label.toLowerCase()} tree`
                    }
                  </p>
                  <Link to="/trees/new" className="btn btn-primary">
                    Create Your First Tree
                  </Link>
                </div>
              ) : (
                <div className="tree-grid enhanced-tree-grid">
                  {filteredTrees.map(tree => (
                    <div key={tree.id} className="tree-card enhanced-tree-card">
                      <div className="tree-card-header">
                        <div className="tree-title-section">
                          <span className="tree-type-icon">{getTreeTypeIcon(tree.tree_type)}</span>
                          <h3 className="tree-card-title">{tree.name}</h3>
                        </div>
                        <div className={getRoleBadgeClass(tree.role)}>
                          {getRoleIcon(tree.role)} {tree.role}
                        </div>
                      </div>
                      
                      <p className="tree-card-description">
                        {tree.description || 'No description available'}
                      </p>
                      
                      <div className="tree-stats">
                        <div className="tree-stat">
                          <span className="stat-number">{tree.member_count || 0}</span>
                          <span className="stat-label">Members</span>
                        </div>
                        <div className="tree-stat">
                          <span className="stat-number">{tree.relationship_count || 0}</span>
                          <span className="stat-label">Relationships</span>
                        </div>
                      </div>

                      <div className="tree-card-actions">
                        <Link 
                          to={`/tree/${tree.id}`} 
                          className="btn btn-primary btn-sm"
                        >
                          🌳 View Tree
                        </Link>
                        {(tree.role === 'owner' || tree.role === 'editor') && (
                          <Link 
                            to={`/trees/${tree.id}/members/new`} 
                            className="btn btn-outline btn-sm"
                          >
                            ✏️ Add Member
                          </Link>
                        )}
                        {tree.role === 'owner' && (
                          <button className="btn btn-outline btn-sm">
                            ⚙️ Settings
                          </button>
                        )}
                      </div>
                      
                      <div className="tree-card-footer">
                        <span className="tree-card-date">
                          Updated {new Date(tree.last_updated || tree.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Members Tab */}
        {activeView === 'members' && (
          <div className="members-content">
            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Family Members</h2>
                <button className="btn btn-primary">
                  + Add Member
                </button>
              </div>
              <div className="coming-soon">
                <div className="coming-soon-icon">👥</div>
                <h3>Member Management</h3>
                <p>Search and manage family members across all your trees</p>
                <div className="feature-preview">
                  <ul>
                    <li>🔍 Advanced member search and filtering</li>
                    <li>🔗 Relationship mapping and visualization</li>
                    <li>🔐 Privacy controls and consent management</li>
                    <li>📊 Member analytics and insights</li>
                  </ul>
                </div>
                <p className="feature-note">Feature coming soon in the next update!</p>
              </div>
            </section>
          </div>
        )}

        {/* Updates Tab */}
        {activeView === 'updates' && (
          <div className="updates-content">
            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Family Updates</h2>
                <button className="btn btn-primary">
                  📝 New Update
                </button>
              </div>
              <div className="coming-soon">
                <div className="coming-soon-icon">📰</div>
                <h3>Family News Feed</h3>
                <p>Share updates, photos, and milestones with your family</p>
                <div className="feature-preview">
                  <ul>
                    <li>📝 Family news and milestone posts</li>
                    <li>📸 Photo sharing with tagging</li>
                    <li>🎂 Birthday and anniversary reminders</li>
                    <li>💬 Comments and family discussions</li>
                  </ul>
                </div>
                <p className="feature-note">Feature coming soon in the next update!</p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
