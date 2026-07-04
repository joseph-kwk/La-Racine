/**
 * components/TreeView.jsx — Updated for new API + member profile routing
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { treeAPI } from '../services/api';
import FamilyTree from './FamilyTree';
import Timeline from './Timeline';

const GENDER_ICONS = { male: '👨', female: '👩', non_binary: '⚧', unknown: '👤' };

const MemberCard = ({ member, treeId }) => {
  const displayDate = (detail) => {
    if (!detail) return null;
    return detail.display || detail.display_text || detail.date?.split('-')[0] || null;
  };

  return (
    <div className="member-card">
      <div className="member-card__avatar">
        {member.photo
          ? <img src={member.photo} alt={member.display_name} className="member-card__avatar-img" />
          : <div className="member-card__avatar-placeholder">{GENDER_ICONS[member.gender] || '👤'}</div>
        }
        {!member.is_alive && <span className="member-card__deceased-dot" title="Deceased" />}
      </div>

      <div className="member-card__body">
        <h3 className="member-card__name">{member.display_name || `${member.first_name} ${member.last_name}`}</h3>

        {member.age && (
          <span className="member-card__age">{member.age}</span>
        )}

        <div className="member-card__dates">
          {member.birth_date_detail && (
            <span>🍼 {displayDate(member.birth_date_detail)}</span>
          )}
          {!member.is_alive && member.death_date_detail && (
            <span>✝ {displayDate(member.death_date_detail)}</span>
          )}
        </div>

        {member.birth_location && (
          <p className="member-card__location">📍 {member.birth_location}</p>
        )}
        {member.occupation && (
          <p className="member-card__occupation">💼 {member.occupation}</p>
        )}
      </div>

      <div className="member-card__actions">
        <Link to={`/members/${member.id}`} className="btn btn--primary btn--sm">
          View Profile
        </Link>
      </div>
    </div>
  );
};

const TreeView = () => {
  const { t } = useTranslation();
  const { treeId } = useParams();
  const [tree, setTree] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        const [treeRes, membersRes] = await Promise.all([
          treeAPI.get(treeId),
          treeAPI.getMembers(treeId),
        ]);
        setTree(treeRes.data);
        const membersData = membersRes.data.results ?? membersRes.data;
        setMembers(membersData);
      } catch {
        setError(t('messages.errorOccurred'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchTreeData();
  }, [treeId]);

  const filtered = search.trim()
    ? members.filter(m =>
        `${m.first_name} ${m.last_name} ${m.nickname || ''}`.toLowerCase()
          .includes(search.toLowerCase())
      )
    : members;

  if (isLoading) {
    return (
      <div className="tree-view__loading">
        <div className="tree-view__loading-spinner">🌳</div>
        <p>{t('messages.loadingData')}</p>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="tree-view__error">
        <p>❌ {error || t('messages.errorOccurred')}</p>
        <Link to="/trees" className="btn btn--primary">Back to Trees</Link>
      </div>
    );
  }

  return (
    <div className="tree-view">
      {/* Page header */}
      <div className="tree-view__header">
        <div className="tree-view__header-info">
          <Link to="/trees" className="tree-view__back">← My Trees</Link>
          <h1 className="tree-view__title">🌳 {tree.name}</h1>
          {tree.description && (
            <p className="tree-view__desc">{tree.description}</p>
          )}
          <div className="tree-view__meta">
            <span className="tree-view__meta-item">👥 {members.length} member{members.length !== 1 ? 's' : ''}</span>
            {tree.privacy_level && (
              <span className="tree-view__meta-item">🔒 {tree.privacy_level}</span>
            )}
          </div>
        </div>
        <div className="tree-view__header-actions">
          <Link to={`/trees/${treeId}/members/new`} className="btn btn--primary">
            + Add Member
          </Link>
        </div>
      </div>

      {/* Controls: view toggle + search */}
      <div className="tree-view__controls">
        <div className="tree-view__view-toggle">
          {[
            { key: 'list',     icon: '📋', label: 'List' },
            { key: 'tree',     icon: '🌳', label: 'Tree' },
            { key: 'timeline', icon: '⏳', label: 'Timeline' },
          ].map(v => (
            <button
              key={v.key}
              className={`tree-view__toggle-btn ${viewMode === v.key ? 'tree-view__toggle-btn--active' : ''}`}
              onClick={() => setViewMode(v.key)}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {viewMode === 'list' && (
          <input
            className="form-input tree-view__search"
            placeholder="🔍 Search members by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {/* Content */}
      {members.length === 0 ? (
        <div className="tree-view__empty">
          <div className="tree-view__empty-icon">👥</div>
          <h2>No members yet</h2>
          <p>Start building your family tree by adding the first member.</p>
          <Link to={`/trees/${treeId}/members/new`} className="btn btn--primary">
            Add First Member
          </Link>
        </div>
      ) : viewMode === 'tree' ? (
        <FamilyTree members={members} onMemberClick={(m) => {}} />
      ) : viewMode === 'timeline' ? (
        <Timeline members={members} onMemberClick={(m) => {}} />
      ) : (
        <div className="tree-view__members-grid">
          {filtered.length === 0 ? (
            <p className="tree-view__no-results">No members match "{search}"</p>
          ) : (
            filtered.map(member => (
              <MemberCard key={member.id} member={member} treeId={treeId} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TreeView;
