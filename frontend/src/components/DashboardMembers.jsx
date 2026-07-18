/**
 * components/DashboardMembers.jsx
 *
 * Global member search across all accessible trees.
 * Fixed:
 * - Uses memberAPI.getAll() (was memberAPI.getAllMembers() which doesn't exist)
 * - Removed all Tailwind utility classes — uses design system
 * - Replaced alert() with inline info text
 * - Full i18n via useTranslation
 * - "View Profile" links to /members/:id
 * - CSS spinner for loading state
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { memberAPI } from '../services/api';

const GENDER_ICONS = {
  male: '👨',
  female: '👩',
  non_binary: '🧑',
  other: '👤',
};

const DashboardMembers = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await memberAPI.getAll();
      setMembers(data.results ?? data);
    } catch {
      setError(t('messages.errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = members.filter(m => {
    const name = `${m.first_name} ${m.last_name} ${m.nickname || ''}`.toLowerCase();
    const loc = (m.birth_location || m.current_location || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || loc.includes(q);
  });

  return (
    <div className="members-content">
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">{t('nav.members')}</h2>
          <span className="section-count">
            {members.length} {t('tree.members').toLowerCase()}
          </span>
        </div>

        {/* Search */}
        <div className="members-search" style={{ marginBottom: '1.5rem' }}>
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>🔍</span>
            <input
              type="search"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder={t('members.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label={t('members.searchPlaceholder')}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
            <button className="btn btn--ghost btn--sm" onClick={fetchMembers} style={{ marginLeft: '1rem' }}>
              {t('messages.tryAgain')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p>{t('messages.loadingData')}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3 className="empty-state-title">
              {searchTerm ? t('members.noResults') : t('members.noMembersYet')}
            </h3>
            <p className="empty-state-text">
              {searchTerm ? t('members.tryDifferentSearch') : t('members.addFromTree')}
            </p>
          </div>
        ) : (
          <div className="members-grid">
            {filteredMembers.map(member => {
              const genderIcon = GENDER_ICONS[member.gender] || '👤';
              const fullName = member.display_name || `${member.first_name} ${member.last_name}`;
              const birthYear = member.birth_date_detail?.date
                ? new Date(member.birth_date_detail.date).getFullYear()
                : null;
              const isDeceased = !member.is_alive;

              return (
                <div key={member.id} className={`member-card ${isDeceased ? 'member-card--deceased' : ''}`}>
                  <div className="member-card-header">
                    <div className="member-avatar">
                      {member.photo
                        ? <img src={member.photo} alt={fullName} className="member-avatar-img" />
                        : <span className="member-avatar-icon">{genderIcon}</span>
                      }
                    </div>
                    <div className="member-card-info">
                      <h3 className="member-card-name">{fullName}</h3>
                      {member.nickname && (
                        <p className="member-card-nickname">"{member.nickname}"</p>
                      )}
                    </div>
                    {isDeceased && <span className="member-card-deceased-badge" title={t('member.deceased')}>✝</span>}
                  </div>

                  <div className="member-card-details">
                    {birthYear && (
                      <div className="member-detail">
                        <span className="member-detail-icon">🎂</span>
                        <span>{birthYear}{isDeceased && member.death_date_detail?.date
                          ? ` – ${new Date(member.death_date_detail.date).getFullYear()}`
                          : ''}</span>
                      </div>
                    )}
                    {(member.birth_location || member.current_location) && (
                      <div className="member-detail">
                        <span className="member-detail-icon">📍</span>
                        <span>{member.current_location || member.birth_location}</span>
                      </div>
                    )}
                    {member.occupation && (
                      <div className="member-detail">
                        <span className="member-detail-icon">💼</span>
                        <span>{member.occupation}</span>
                      </div>
                    )}
                  </div>

                  <div className="member-card-actions">
                    <Link to={`/members/${member.id}`} className="btn btn--primary btn--sm">
                      {t('member.viewProfile')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardMembers;
