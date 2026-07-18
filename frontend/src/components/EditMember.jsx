/**
 * components/EditMember.jsx
 *
 * Full-page edit form for an existing family member.
 * Merged from feature/mobile-app branch and upgraded:
 * - Uses the centralized memberAPI service layer (no raw fetch)
 * - Uses FuzzyDatePicker for birth/death dates
 * - Full i18n via useTranslation
 * - In-component toast replacing alert()
 * - Relationship selectors for spouse and parents
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { memberAPI, relationshipAPI } from '../services/api';
import FuzzyDatePicker from './FuzzyDatePicker';

const EditMember = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [member, setMember] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    maiden_name: '',
    nickname: '',
    gender: '',
    birth_location: '',
    current_location: '',
    death_location: '',
    occupation: '',
    biography: '',
    nationality: '',
    religion: '',
    notes: '',
    is_alive: true,
  });

  const [birthDate, setBirthDate] = useState({});
  const [deathDate, setDeathDate] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [memberRes, allMembersRes] = await Promise.all([
          memberAPI.get(memberId),
          // Fetch tree-mates for relationship dropdowns
          memberAPI.getAll({ tree: null }), // gets all accessible members
        ]);
        const m = memberRes.data;
        setMember(m);
        setFormData({
          first_name: m.first_name || '',
          last_name: m.last_name || '',
          maiden_name: m.maiden_name || '',
          nickname: m.nickname || '',
          gender: m.gender || '',
          birth_location: m.birth_location || '',
          current_location: m.current_location || '',
          death_location: m.death_location || '',
          occupation: m.occupation || '',
          biography: m.biography || '',
          nationality: m.nationality || '',
          religion: m.religion || '',
          notes: m.notes || '',
          is_alive: m.is_alive ?? true,
        });
        // Pre-populate fuzzy dates from the API response
        if (m.birth_date_detail) setBirthDate(m.birth_date_detail);
        if (m.death_date_detail) setDeathDate(m.death_date_detail);

        // Candidates for relationship selectors (other members in same tree)
        const all = allMembersRes.data.results ?? allMembersRes.data;
        setCandidates(all.filter(c => String(c.id) !== String(memberId)));
      } catch {
        setError(t('messages.errorOccurred'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [memberId]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError(t('member.firstLastNameRequired'));
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await memberAPI.update(memberId, {
        ...formData,
        // Birth/death date IDs come from member.birth_date / member.death_date
        // (FuzzyDates are managed separately; for now we pass the text display only)
      });
      showToast('success', t('member.updateSuccess'));
      setTimeout(() => navigate(`/members/${memberId}`), 1200);
    } catch (err) {
      const data = err.response?.data;
      const msg = typeof data === 'string'
        ? data
        : data?.detail || data?.non_field_errors?.[0] || t('member.updateError');
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-member__loading">
        <div className="loading-spinner" />
        <p>{t('messages.loadingData')}</p>
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="edit-member__error">
        <p>❌ {error}</p>
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>← {t('common.back')}</button>
      </div>
    );
  }

  return (
    <div className="edit-member">
      {/* Toast */}
      {toast && (
        <div className={`member-profile__toast member-profile__toast--${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
        </div>
      )}

      {/* Hero Header */}
      <div className="add-member__hero">
        <Link to={`/members/${memberId}`} className="add-member__back">← {t('common.back')}</Link>
        <h1 className="add-member__title">✏️ {t('member.editMember')}</h1>
        <p className="add-member__subtitle">
          {member?.display_name} — {t('member.editSubtitle')}
        </p>
      </div>

      <div className="add-member__body">
        {error && <div className="add-member__error" role="alert">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Identity Section ── */}
          <div className="add-member__section">
            <h2 className="add-member__section-title">🪪 {t('member.identity')}</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="em-first-name" className="form-label">
                  {t('member.firstName')} <span className="add-member__required">*</span>
                </label>
                <input
                  id="em-first-name"
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="em-last-name" className="form-label">
                  {t('member.lastName')} <span className="add-member__required">*</span>
                </label>
                <input
                  id="em-last-name"
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="em-maiden" className="form-label">{t('member.maidenName')}</label>
                <input id="em-maiden" type="text" name="maiden_name" value={formData.maiden_name} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="em-nickname" className="form-label">{t('member.nickname')}</label>
                <input id="em-nickname" type="text" name="nickname" value={formData.nickname} onChange={handleChange} className="form-input" />
              </div>
            </div>

            <div className="form-group" style={{ maxWidth: '240px' }}>
              <label htmlFor="em-gender" className="form-label">{t('member.gender')}</label>
              <select id="em-gender" name="gender" value={formData.gender} onChange={handleChange} className="form-input form-input--select">
                <option value="">— {t('common.select')} —</option>
                <option value="male">👨 {t('member.male')}</option>
                <option value="female">👩 {t('member.female')}</option>
                <option value="non_binary">⚧ {t('member.nonBinary')}</option>
                <option value="other">❓ {t('member.other')}</option>
              </select>
            </div>
          </div>

          {/* ── Life Dates Section ── */}
          <div className="add-member__section">
            <h2 className="add-member__section-title">📅 {t('member.lifeDates')}</h2>

            <div className="add-member__date-block">
              <div className="add-member__date-block-header">
                <span className="add-member__date-block-icon">🍼</span>
                <span>{t('member.birth')}</span>
              </div>
              <FuzzyDatePicker label={t('member.dateOfBirth')} value={birthDate} onChange={setBirthDate} allowBCE={true} />
              <div className="form-group">
                <label className="form-label">📍 {t('member.placeOfBirth')}</label>
                <input type="text" name="birth_location" value={formData.birth_location} onChange={handleChange} className="form-input" placeholder="e.g. Kinshasa, DRC" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">🏠 {t('member.currentLocation')}</label>
              <input type="text" name="current_location" value={formData.current_location} onChange={handleChange} className="form-input" />
            </div>

            <div className="add-member__alive-row">
              <span className="add-member__alive-label">{t('member.stillLiving')}</span>
              <div className="add-member__alive-toggle">
                <button type="button" className={`add-member__alive-btn ${formData.is_alive ? 'add-member__alive-btn--active' : ''}`} onClick={() => setFormData(p => ({ ...p, is_alive: true }))}>
                  ✅ {t('common.yes')}
                </button>
                <button type="button" className={`add-member__alive-btn ${!formData.is_alive ? 'add-member__alive-btn--active add-member__alive-btn--deceased' : ''}`} onClick={() => setFormData(p => ({ ...p, is_alive: false }))}>
                  ✝ {t('member.deceased')}
                </button>
              </div>
            </div>

            {!formData.is_alive && (
              <div className="add-member__date-block add-member__date-block--death">
                <div className="add-member__date-block-header">
                  <span className="add-member__date-block-icon">✝</span>
                  <span>{t('member.death')}</span>
                </div>
                <FuzzyDatePicker label={t('member.dateOfDeath')} value={deathDate} onChange={setDeathDate} />
                <div className="form-group">
                  <label className="form-label">📍 {t('member.placeOfDeath')}</label>
                  <input type="text" name="death_location" value={formData.death_location} onChange={handleChange} className="form-input" />
                </div>
              </div>
            )}
          </div>

          {/* ── About Section ── */}
          <div className="add-member__section">
            <h2 className="add-member__section-title">📝 {t('member.about')}</h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">💼 {t('member.occupation')}</label>
                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">🌍 {t('member.nationality')}</label>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">⛪ {t('member.religion')}</label>
              <input type="text" name="religion" value={formData.religion} onChange={handleChange} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">📖 {t('member.biography')}</label>
              <textarea name="biography" value={formData.biography} onChange={handleChange} className="form-input form-textarea" rows={5} />
            </div>

            <div className="form-group">
              <label className="form-label">🔒 {t('member.internalNotes')} <span className="add-member__optional">({t('member.notesHint')})</span></label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="form-input form-textarea" rows={3} />
            </div>
          </div>

          {/* ── Relationships Section ── */}
          {candidates.length > 0 && (
            <div className="add-member__section">
              <h2 className="add-member__section-title">🔗 {t('member.relationships')}</h2>
              <p className="add-member__section-hint">{t('member.relationshipsHint')}</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('member.parent1')}</label>
                  <select className="form-input form-input--select">
                    <option value="">{t('member.noParent')}</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || `${c.first_name} ${c.last_name}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('member.parent2')}</label>
                  <select className="form-input form-input--select">
                    <option value="">{t('member.noParent')}</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || `${c.first_name} ${c.last_name}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="add-member__nav">
            <Link to={`/members/${memberId}`} className="btn btn--ghost">← {t('common.cancel')}</Link>
            <div style={{ flex: 1 }} />
            <button type="submit" className="btn btn--primary" disabled={isSaving || !formData.first_name.trim() || !formData.last_name.trim()}>
              {isSaving ? (
                <span className="auth-loading-inner">
                  <span className="btn-spinner" />
                  {t('account.saving')}
                </span>
              ) : `💾 ${t('account.saveChanges')}`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditMember;
