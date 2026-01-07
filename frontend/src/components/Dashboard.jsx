import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { treeAPI } from '../services/api';

const Dashboard = () => {
  const { t } = useTranslation();
  // Auth state used via global Header; no local auth usage here
  const [trees, setTrees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [selectedTreeType, setSelectedTreeType] = useState('all');

  // Tree type definitions for enhanced categorization
  const treeTypeOptions = [
    { value: 'all', label: t('treeTypes.allTrees'), icon: '🌳', description: t('treeTypes.viewAllTrees') },
    { value: 'primary', label: t('treeTypes.primaryFamily'), icon: '🏠', description: t('treeTypes.mainNuclearFamily') },
    { value: 'maternal', label: t('treeTypes.maternalLine'), icon: '👩', description: t('treeTypes.mothersSide') },
    { value: 'paternal', label: t('treeTypes.paternalLine'), icon: '👨', description: t('treeTypes.fathersSide') },
    { value: 'extended', label: t('treeTypes.extendedFamily'), icon: '👨‍👩‍👧‍👦', description: t('treeTypes.cousinsAuntsUncles') },
    { value: 'adopted', label: t('treeTypes.adoptedFamily'), icon: '💝', description: t('treeTypes.adoptedConnections') },
    { value: 'step', label: t('treeTypes.stepFamily'), icon: '👫', description: t('treeTypes.stepParentLines') },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await treeAPI.getAllTrees();
        const enhancedTrees = data.map(tree => ({
          ...tree,
          tree_type: tree.tree_type || 'primary',
          member_count: tree.member_count || Math.floor(Math.random() * 50) + 5,
          role: tree.role || 'owner',
          last_updated: tree.updated_at || tree.created_at,
          relationship_count: tree.relationship_count || Math.floor(Math.random() * 100) + 10,
        }));
        setTrees(enhancedTrees);

        // Fetch notifications
        const token = localStorage.getItem('access_token');
        const notificationsResponse = await fetch('http://127.0.0.1:8000/api/notifications/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json();
          setNotifications(notificationsData.slice(0, 5)); // Show only recent 5
        }
      } catch {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Header handles logout globally

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
          <p className="empty-state-text">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
  {/* Global header is rendered in App */}

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📊 {t('dashboard.overview')}
        </button>
        <button 
          className={`nav-tab ${activeView === 'trees' ? 'active' : ''}`}
          onClick={() => setActiveView('trees')}
        >
          🌳 {t('dashboard.familyTrees')}
        </button>
        <button 
          className={`nav-tab ${activeView === 'members' ? 'active' : ''}`}
          onClick={() => setActiveView('members')}
        >
          👥 {t('dashboard.members')}
        </button>
        <button 
          className={`nav-tab ${activeView === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveView('updates')}
        >
          📰 {t('dashboard.updates')}
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
              <h2 className="section-title">{t('dashboard.familyStatistics')}</h2>
              <div className="stats-grid enhanced-stats">
                <div className="stat-card stat-primary">
                  <div className="stat-icon">🌳</div>
                  <div className="stat-content">
                    <div className="stat-number">{trees.length}</div>
                    <div className="stat-label">{t('dashboard.familyTrees')}</div>
                  </div>
                </div>
                <div className="stat-card stat-secondary">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {trees.reduce((total, tree) => total + (tree.member_count || 0), 0)}
                    </div>
                    <div className="stat-label">{t('dashboard.totalMembers')}</div>
                  </div>
                </div>
                <div className="stat-card stat-accent">
                  <div className="stat-icon">👑</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {trees.filter(tree => tree.role === 'owner').length}
                    </div>
                    <div className="stat-label">{t('dashboard.treesOwned')}</div>
                  </div>
                </div>
                <div className="stat-card stat-info">
                  <div className="stat-icon">🔗</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {trees.reduce((total, tree) => total + (tree.relationship_count || 0), 0)}
                    </div>
                    <div className="stat-label">{t('dashboard.relationships')}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="dashboard-section">
              <h2 className="section-title">{t('dashboard.quickActions')}</h2>
              <div className="action-grid enhanced-actions">
                <Link to="/trees/new" className="action-card action-card-primary">
                  <div className="action-icon">🌳</div>
                  <h3>{t('dashboard.createNewTree')}</h3>
                  <p>{t('dashboard.startNewBranch')}</p>
                </Link>
                <div className="action-card action-card-secondary" onClick={() => setActiveView('trees')}>
                  <div className="action-icon">👥</div>
                  <h3>{t('dashboard.addFamilyMember')}</h3>
                  <p>{t('dashboard.addRelatives')}</p>
                </div>
                <div className="action-card action-card-accent" onClick={() => setActiveView('updates')}>
                  <div className="action-icon">📸</div>
                  <h3>{t('dashboard.shareUpdate')}</h3>
                  <p>{t('dashboard.postFamilyNews')}</p>
                </div>
                <Link to="/trees" className="action-card action-card-info">
                  <div className="action-icon">📊</div>
                  <h3>{t('dashboard.viewAnalytics')}</h3>
                  <p>{t('dashboard.familyInsights')}</p>
                </Link>
              </div>
            </section>

            {/* Recent Notifications */}
            {notifications.length > 0 && (
              <section className="dashboard-section">
                <div className="section-header">
                  <h2 className="section-title">{t('dashboard.recentNotifications')}</h2>
                  <Link to="/notifications" className="btn btn-outline">
                    {t('dashboard.viewAll')}
                  </Link>
                </div>
                <div className="notifications-preview">
                  {notifications.map(notification => (
                    <div key={notification.id} className="notification-item">
                      <div className="notification-icon">
                        {notification.type === 'Birthday' && '🎂'}
                        {notification.type === 'Death' && '🕊️'}
                        {notification.type === 'Addition' && '👶'}
                      </div>
                      <div className="notification-content">
                        <p>
                          <strong>{notification.related_member.first_name} {notification.related_member.last_name}</strong>
                          {notification.type === 'Birthday' && ' has a birthday!'}
                          {notification.type === 'Death' && ' has passed away.'}
                          {notification.type === 'Addition' && ' was added to your tree.'}
                        </p>
                        <span className="notification-date">
                          {new Date(notification.event_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Activity */}
            <section className="dashboard-section">
              <h2 className="section-title">{t('dashboard.recentActivity')}</h2>
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
                <h2 className="section-title">{t('dashboard.yourFamilyTrees')}</h2>
                <Link to="/trees/new" className="btn btn-primary">
                  {t('dashboard.createNewTreeBtn')}
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
                    {selectedTreeType === 'all' ? t('dashboard.noTreesYet') : `No ${treeTypeOptions.find(opt => opt.value === selectedTreeType)?.label} Trees`}
                  </h3>
                  <p className="empty-state-text">
                    {selectedTreeType === 'all' 
                      ? t('dashboard.createFirstTree')
                      : `Create a ${treeTypeOptions.find(opt => opt.value === selectedTreeType)?.label.toLowerCase()} tree`
                    }
                  </p>
                  <Link to="/trees/new" className="btn btn-primary">
                    {t('dashboard.createYourFirstTree')}
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
