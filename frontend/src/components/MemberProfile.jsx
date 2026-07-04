/**
 * components/MemberProfile.jsx
 *
 * Full-page profile view for a single family member.
 * Features:
 * - Rich member info (name, dates, bio, location, occupation)
 * - Life events timeline
 * - Relationships list
 * - Change history
 * - "Propose a Change" modal
 * - "Claim Profile" button (if no account linked)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { memberAPI, lifeEventAPI, profileAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const EVENT_ICONS = {
  birth: '🍼', baptism: '⛪', education: '🎓', graduation: '🎓',
  career: '💼', military: '🎖️', marriage: '💍', divorce: '📄',
  engagement: '💎', child_born: '👶', adoption: '🏠', moved: '📍',
  emigrated: '✈️', immigrated: '🛬', award: '🏆', publication: '📚',
  retirement: '🌅', death: '⚰️', memorial: '🕯️', other: '📌',
};

function FuzzyDateDisplay({ date }) {
  if (!date) return <span className="text-gray-400 italic">Unknown</span>;
  return <span>{date.display || date.date || 'Unknown'}</span>;
}

function RelationshipBadge({ rel }) {
  const otherMember = rel.from_member_name !== rel.to_member_name
    ? rel.to_member_name
    : rel.from_member_name;
  return (
    <div className="member-profile__relation-badge">
      <span className="member-profile__relation-type">{rel.relationship_display}</span>
      <span className="member-profile__relation-name">{otherMember}</span>
    </div>
  );
}

function ProposeChangeModal({ member, fieldName, fieldLabel, currentValue, onClose, onSuccess }) {
  const [newValue, setNewValue] = useState(currentValue || '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await memberAPI.proposeChange(member.id, {
        field_name: fieldName,
        new_value: newValue,
        reason,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit change request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Propose Change: {fieldLabel}</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal__body">
          <div className="form-group">
            <label className="form-label">New Value for "{fieldLabel}"</label>
            <textarea
              className="form-input"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Why are you proposing this change?</label>
            <textarea
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Found a birth certificate confirming the correct date"
              rows={2}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Change Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [member, setMember] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [lifeEvents, setLifeEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [proposeModal, setProposeModal] = useState(null); // { fieldName, fieldLabel, currentValue }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [memberRes, relsRes, eventsRes] = await Promise.all([
          memberAPI.get(memberId),
          memberAPI.getRelationships(memberId),
          lifeEventAPI.getAll({ member: memberId }),
        ]);
        setMember(memberRes.data);
        setRelationships(relsRes.data);
        const eventsData = eventsRes.data.results ?? eventsRes.data;
        setLifeEvents(eventsData.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
      } catch {
        setError('Could not load this family member.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [memberId]);

  const handleClaimProfile = async () => {
    try {
      await profileAPI.claimMember(memberId);
      alert('Profile claimed! This family member is now linked to your account.');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not claim this profile.');
    }
  };

  if (loading) return <div className="member-profile__loading">Loading profile…</div>;
  if (error) return <div className="member-profile__error">{error}</div>;
  if (!member) return null;

  const isLinkedToMe = member.user_account === user?.id;
  const canEdit = true; // Simplified — actual perm check is server-side

  return (
    <div className="member-profile">
      {/* ── Hero ── */}
      <div className="member-profile__hero">
        <div className="member-profile__hero-bg" />
        <div className="member-profile__hero-content">
          <div className="member-profile__avatar-wrap">
            {member.photo ? (
              <img
                className="member-profile__avatar"
                src={member.photo}
                alt={member.display_name}
              />
            ) : (
              <div className="member-profile__avatar-placeholder">
                {(member.first_name?.[0] || '?')}{(member.last_name?.[0] || '')}
              </div>
            )}
            {!member.is_alive && (
              <span className="member-profile__deceased-badge">1922 – {member.death_date_detail?.display || '?'}</span>
            )}
          </div>

          <div className="member-profile__hero-info">
            <h1 className="member-profile__name">{member.display_name}</h1>
            {member.maiden_name && (
              <p className="member-profile__maiden">née {member.maiden_name}</p>
            )}
            <p className="member-profile__dates">
              <FuzzyDateDisplay date={member.birth_date_detail} />
              {' — '}
              {member.is_alive ? 'Present' : <FuzzyDateDisplay date={member.death_date_detail} />}
            </p>
            {/* Age — respects show_age preference */}
            {member.age && (
              <p className="member-profile__age">
                🎂 {member.age}
                {!member.is_alive && ' at time of passing'}
              </p>
            )}
            {member.current_location && (
              <p className="member-profile__location">📍 {member.current_location}</p>
            )}
            {member.occupation && (
              <p className="member-profile__occupation">💼 {member.occupation}</p>
            )}
          </div>

          <div className="member-profile__hero-actions">
            {!isLinkedToMe && !member.user_account && (
              <button
                className="btn btn--accent"
                onClick={handleClaimProfile}
                title="This is me — link my account to this profile"
              >
                🔑 This Is Me
              </button>
            )}
            {isLinkedToMe && (
              <span className="member-profile__verified-badge">✅ Your Profile</span>
            )}
            <Link to={`/trees/${member.tree}`} className="btn btn--ghost">
              ← Back to Tree
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="member-profile__tabs">
        {['info', 'timeline', 'relationships', 'changes'].map((tab) => (
          <button
            key={tab}
            className={`member-profile__tab ${activeTab === tab ? 'member-profile__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'info' && '📋 Info'}
            {tab === 'timeline' && '📅 Timeline'}
            {tab === 'relationships' && '👥 Family'}
            {tab === 'changes' && '📝 Changes'}
          </button>
        ))}
      </div>

      <div className="member-profile__body">

        {/* ── Info Tab ── */}
        {activeTab === 'info' && (
          <div className="member-profile__section">
            {member.biography && (
              <div className="member-profile__card">
                <div className="member-profile__card-header">
                  <h2>Biography</h2>
                  {canEdit && (
                    <button
                      className="btn btn--xs btn--ghost"
                      onClick={() => setProposeModal({ fieldName: 'biography', fieldLabel: 'Biography', currentValue: member.biography })}
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
                <p className="member-profile__bio">{member.biography}</p>
              </div>
            )}

            <div className="member-profile__grid">
              <div className="member-profile__card">
                <h2 className="member-profile__card-title">Personal Details</h2>
                <dl className="member-profile__dl">
                  {member.nationality && <><dt>Nationality</dt><dd>{member.nationality}</dd></>}
                  {member.ethnicity && <><dt>Ethnicity</dt><dd>{member.ethnicity}</dd></>}
                  {member.religion && <><dt>Religion</dt><dd>{member.religion}</dd></>}
                  {member.education && <><dt>Education</dt><dd>{member.education}</dd></>}
                  {member.gender && <><dt>Gender</dt><dd>{member.gender}</dd></>}
                </dl>
              </div>

              <div className="member-profile__card">
                <h2 className="member-profile__card-title">Locations</h2>
                <dl className="member-profile__dl">
                  {member.birth_location && <><dt>🍼 Born in</dt><dd>{member.birth_location}</dd></>}
                  {member.current_location && <><dt>📍 Lives in</dt><dd>{member.current_location}</dd></>}
                  {member.death_location && <><dt>⚰️ Passed in</dt><dd>{member.death_location}</dd></>}
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* ── Timeline Tab ── */}
        {activeTab === 'timeline' && (
          <div className="member-profile__section">
            <div className="member-profile__card">
              <h2 className="member-profile__card-title">Life Timeline</h2>
              {lifeEvents.length === 0 ? (
                <p className="member-profile__empty">No life events recorded yet.</p>
              ) : (
                <div className="timeline">
                  {lifeEvents.map((event) => (
                    <div key={event.id} className="timeline__item">
                      <div className="timeline__icon">
                        {EVENT_ICONS[event.event_type] || '📌'}
                      </div>
                      <div className="timeline__content">
                        <div className="timeline__date">
                          {event.date_display || event.date || 'Unknown date'}
                          {event.date_is_approximate && ' (approx.)'}
                        </div>
                        <h3 className="timeline__title">{event.title}</h3>
                        {event.description && (
                          <p className="timeline__desc">{event.description}</p>
                        )}
                        {event.location && (
                          <p className="timeline__location">📍 {event.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Relationships Tab ── */}
        {activeTab === 'relationships' && (
          <div className="member-profile__section">
            <div className="member-profile__card">
              <h2 className="member-profile__card-title">Family Relationships</h2>
              {relationships.length === 0 ? (
                <p className="member-profile__empty">No relationships recorded yet.</p>
              ) : (
                <div className="member-profile__relations-grid">
                  {relationships.map((rel) => (
                    <RelationshipBadge key={rel.id} rel={rel} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Changes Tab ── */}
        {activeTab === 'changes' && (
          <div className="member-profile__section">
            <ChangeRequestsPanel memberId={member.id} />
          </div>
        )}
      </div>

      {/* ── Propose Change Modal ── */}
      {proposeModal && (
        <ProposeChangeModal
          member={member}
          fieldName={proposeModal.fieldName}
          fieldLabel={proposeModal.fieldLabel}
          currentValue={proposeModal.currentValue}
          onClose={() => setProposeModal(null)}
          onSuccess={() => {/* optionally reload */ }}
        />
      )}
    </div>
  );
}

// Sub-component: Change Requests Panel
function ChangeRequestsPanel({ memberId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberAPI.getChangeRequests(memberId)
      .then((res) => setRequests(res.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <p className="member-profile__empty">Loading changes…</p>;

  return (
    <div className="member-profile__card">
      <h2 className="member-profile__card-title">Change History</h2>
      {requests.length === 0 ? (
        <p className="member-profile__empty">No change requests for this member.</p>
      ) : (
        <div className="change-requests">
          {requests.map((cr) => (
            <div key={cr.id} className={`change-request change-request--${cr.status}`}>
              <div className="change-request__header">
                <span className="change-request__field">{cr.field_name}</span>
                <span className={`change-request__status change-request__status--${cr.status}`}>
                  {cr.status_display}
                </span>
              </div>
              <div className="change-request__body">
                <span className="change-request__by">by {cr.requested_by_username}</span>
                {cr.reason && <p className="change-request__reason">"{cr.reason}"</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
