import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { treeAPI, memberAPI } from '../services/api';
import FamilyTree from './FamilyTree';

const TreeView = () => {
  const { t } = useTranslation();
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'tree'

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        const token = localStorage.getItem('access_token');

        // Fetch tree details
        const treeResponse = await treeAPI.getTree(treeId);
        setTree(treeResponse.data);

        // Fetch tree members
        const membersResponse = await treeAPI.getTreeMembers(treeId);
        setMembers(membersResponse.data);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTreeData();
  }, [treeId]);

  const handleMemberClick = (member) => {
    // Navigate to edit page or show modal
    navigate(`/trees/${treeId}/members/${member.id}/edit`);
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from the tree?`)) {
      return;
    }

    try {
      await memberAPI.deleteMember(memberId);
      setMembers(members.filter(member => member.id !== memberId));
    } catch {
      setError('Network error. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">{t('messages.loadingData')}</p>
        </div>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <p className="empty-state-text">{error || t('messages.errorOccurred')}</p>
          <Link to="/trees" className="btn btn-primary mt-4">
            Back to Trees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Navigation Header */}
      <nav className="nav-header">
        <div className="nav-content">
          <div className="nav-brand">
            <h1>🌳 {tree.name}</h1>
            <span className="nav-welcome">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="nav-actions">
            <Link to={`/trees/${treeId}/members/new`} className="btn btn-primary">
              Add Member
            </Link>
            <Link to="/trees" className="btn btn-secondary">
              Back to Trees
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2 className="welcome-title">
            👨‍👩‍👧‍👦 Family Members
          </h2>
          {tree.description && (
            <p className="welcome-description">
              {tree.description}
            </p>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {members.length > 0 && (
            <div className="view-toggle" style={{ marginBottom: '20px' }}>
              <button
                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('list')}
              >
                📋 List View
              </button>
              <button
                className={`btn ${viewMode === 'tree' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('tree')}
                style={{ marginLeft: '10px' }}
              >
                🌳 Tree View
              </button>
            </div>
          )}

          {members.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p className="empty-state-text">
                No family members added yet. Start building your family tree!
              </p>
              <Link to={`/trees/${treeId}/members/new`} className="btn btn-primary mt-4">
                Add First Member
              </Link>
            </div>
          ) : viewMode === 'tree' ? (
            <FamilyTree members={members} onMemberClick={handleMemberClick} />
          ) : (
            <div className="members-grid">
              {members.map(member => (
                <div key={member.id} className="member-card">
                  <div className="member-card-header">
                    <h3 className="member-card-name">
                      {member.first_name} {member.last_name}
                    </h3>
                    <div className="member-card-actions">
                      <Link
                        to={`/trees/${treeId}/members/${member.id}/edit`}
                        className="btn btn-primary btn-sm"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteMember(member.id, `${member.first_name} ${member.last_name}`)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="member-card-details">
                    {member.birth_date && (
                      <p className="member-detail">
                        <strong>Born:</strong> {new Date(member.birth_date).toLocaleDateString()}
                      </p>
                    )}
                    {member.death_date && (
                      <p className="member-detail">
                        <strong>Died:</strong> {new Date(member.death_date).toLocaleDateString()}
                      </p>
                    )}
                    {member.gender && (
                      <p className="member-detail">
                        <strong>Gender:</strong> {member.gender}
                      </p>
                    )}
                    {member.relationship && (
                      <p className="member-detail">
                        <strong>Relationship:</strong> {member.relationship}
                      </p>
                    )}
                  </div>

                  {member.notes && (
                    <div className="member-card-notes">
                      <strong>Notes:</strong>
                      <p>{member.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TreeView;
