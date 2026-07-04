/**
 * components/AddMember.jsx
 *
 * Multi-step form to add a new family member to a tree.
 * Sections:
 *   1. Identity  — name, gender, maiden name
 *   2. Life Dates — birth date (FuzzyDate), place of birth, death info
 *   3. About     — occupation, biography, nationality, religion
 *   4. Notes     — internal notes
 */

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { memberAPI, fuzzyDateAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import FuzzyDatePicker from './FuzzyDatePicker';

// Step definitions
const STEPS = ['Identity', 'Life Dates', 'About', 'Review'];

const AddMember = () => {
  const { t } = useTranslation();
  const { treeId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Identity
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [maidenName, setMaidenName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');

  // Life Dates
  const [birthDate, setBirthDate] = useState({});   // FuzzyDate object
  const [birthLocation, setBirthLocation] = useState('');
  const [isAlive, setIsAlive] = useState(true);
  const [deathDate, setDeathDate] = useState({});    // FuzzyDate object
  const [deathLocation, setDeathLocation] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [showAge, setShowAge] = useState(true);      // owner preference for age display

  // About
  const [occupation, setOccupation] = useState('');
  const [biography, setBiography] = useState('');
  const [nationality, setNationality] = useState('');
  const [religion, setReligion] = useState('');
  const [notes, setNotes] = useState('');

  const canNext = step === 0
    ? firstName.trim() && lastName.trim()
    : true;

  /** Create a FuzzyDate record and return its ID, or null if empty */
  const createFuzzyDate = async (fuzzyObj) => {
    if (!fuzzyObj || (!fuzzyObj.date && !fuzzyObj.display_text)) return null;
    const { data } = await fuzzyDateAPI.create(fuzzyObj);
    return data.id;
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const birthDateId  = await createFuzzyDate(birthDate);
      const deathDateId  = !isAlive ? await createFuzzyDate(deathDate) : null;

      const payload = {
        tree: parseInt(treeId),
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        ...(maidenName      && { maiden_name: maidenName }),
        ...(nickname        && { nickname }),
        ...(gender          && { gender }),
        ...(birthDateId     && { birth_date: birthDateId }),
        ...(birthLocation   && { birth_location: birthLocation }),
        is_alive: isAlive,
        ...(deathDateId     && { death_date: deathDateId }),
        ...(deathLocation   && { death_location: deathLocation }),
        ...(currentLocation && { current_location: currentLocation }),
        ...(occupation      && { occupation }),
        ...(biography       && { biography }),
        ...(nationality     && { nationality }),
        ...(religion        && { religion }),
        ...(notes           && { notes }),
        show_age: showAge,
      };

      await memberAPI.create(payload);
      navigate(`/trees/${treeId}`);
    } catch (err) {
      const data = err.response?.data;
      const msg = typeof data === 'string'
        ? data
        : data?.detail || data?.non_field_errors?.[0] || 'Failed to add member.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived display values for Review step ──────────────────────────────
  const formatFuzzy = (f) => {
    if (!f || (!f.date && !f.display_text)) return '—';
    if (f.display_text) return f.display_text;
    if (f.precision === 'year' && f.date) return f.date.split('-')[0];
    return f.date || '—';
  };

  return (
    <div className="add-member">
      {/* ── Header ── */}
      <div className="add-member__hero">
        <Link to={`/trees/${treeId}`} className="add-member__back">← Back to Tree</Link>
        <h1 className="add-member__title">👤 Add Family Member</h1>
        <p className="add-member__subtitle">
          Fill in as much or as little as you know — everything can be updated later.
        </p>

        {/* Step indicator */}
        <div className="add-member__steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`add-member__step ${i === step ? 'add-member__step--active' : ''} ${i < step ? 'add-member__step--done' : ''}`}>
              <div className="add-member__step-dot">
                {i < step ? '✓' : i + 1}
              </div>
              <span className="add-member__step-label">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="add-member__body">
        {error && <div className="add-member__error">{error}</div>}

        {/* ── Step 0: Identity ── */}
        {step === 0 && (
          <div className="add-member__section">
            <h2 className="add-member__section-title">🪪 Identity</h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('member.firstName')} <span className="add-member__required">*</span></label>
                <input
                  className="form-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Marie"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('member.lastName')} <span className="add-member__required">*</span></label>
                <input
                  className="form-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Kasongo"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Maiden Name <span className="add-member__optional">(if applicable)</span></label>
                <input
                  className="form-input"
                  value={maidenName}
                  onChange={(e) => setMaidenName(e.target.value)}
                  placeholder="Birth surname for married women"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nickname</label>
                <input
                  className="form-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Preferred name or nickname"
                />
              </div>
            </div>

            <div className="form-group" style={{ maxWidth: '240px' }}>
              <label className="form-label">{t('member.gender')}</label>
              <select className="form-input form-input--select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">— Select —</option>
                <option value="male">👨 Male</option>
                <option value="female">👩 Female</option>
                <option value="non_binary">⚧ Non-binary</option>
                <option value="unknown">❓ Unknown</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Step 1: Life Dates ── */}
        {step === 1 && (
          <div className="add-member__section">
            <h2 className="add-member__section-title">📅 Life Dates & Places</h2>
            <p className="add-member__section-hint">
              Only enter what you know. All dates support full dates, year only, or estimates like "around 1920s".
            </p>

            {/* Birth */}
            <div className="add-member__date-block">
              <div className="add-member__date-block-header">
                <span className="add-member__date-block-icon">🍼</span>
                <span>Birth</span>
              </div>

              <FuzzyDatePicker
                label="Date of Birth"
                value={birthDate}
                onChange={setBirthDate}
                allowBCE={true}
              />

              <div className="form-group">
                <label className="form-label">
                  📍 Place of Birth
                  <span className="add-member__optional"> (city, country)</span>
                </label>
                <input
                  className="form-input"
                  value={birthLocation}
                  onChange={(e) => setBirthLocation(e.target.value)}
                  placeholder="e.g. Kinshasa, DRC  or  Paris, France"
                />
                <p className="add-member__field-hint">A map will be added in a future update.</p>
              </div>
            </div>

            {/* Current location */}
            <div className="form-group">
              <label className="form-label">🏠 Current / Last Known Location</label>
              <input
                className="form-input"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="Where does / did this person live?"
              />
            </div>

            {/* Age display preference */}
            <label className="add-member__toggle-row">
              <input
                type="checkbox"
                checked={showAge}
                onChange={(e) => setShowAge(e.target.checked)}
              />
              <span>
                <strong>Show calculated age</strong> on their profile
                <span className="add-member__field-hint"> — you can always change this later</span>
              </span>
            </label>

            {/* Is alive */}
            <div className="add-member__alive-row">
              <span className="add-member__alive-label">Still living?</span>
              <div className="add-member__alive-toggle">
                <button
                  type="button"
                  className={`add-member__alive-btn ${isAlive ? 'add-member__alive-btn--active' : ''}`}
                  onClick={() => setIsAlive(true)}
                >
                  ✅ Yes
                </button>
                <button
                  type="button"
                  className={`add-member__alive-btn ${!isAlive ? 'add-member__alive-btn--active add-member__alive-btn--deceased' : ''}`}
                  onClick={() => setIsAlive(false)}
                >
                  ✝ No (Deceased)
                </button>
              </div>
            </div>

            {/* Death fields — only if deceased */}
            {!isAlive && (
              <div className="add-member__date-block add-member__date-block--death">
                <div className="add-member__date-block-header">
                  <span className="add-member__date-block-icon">✝</span>
                  <span>Death</span>
                </div>

                <FuzzyDatePicker
                  label="Date of Death"
                  value={deathDate}
                  onChange={setDeathDate}
                />

                <div className="form-group">
                  <label className="form-label">📍 Place of Death</label>
                  <input
                    className="form-input"
                    value={deathLocation}
                    onChange={(e) => setDeathLocation(e.target.value)}
                    placeholder="e.g. Lubumbashi, DRC"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: About ── */}
        {step === 2 && (
          <div className="add-member__section">
            <h2 className="add-member__section-title">📝 About</h2>
            <p className="add-member__section-hint">All fields are optional — add what you know.</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">💼 Occupation</label>
                <input
                  className="form-input"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Teacher, Farmer, Doctor"
                />
              </div>
              <div className="form-group">
                <label className="form-label">🌍 Nationality</label>
                <input
                  className="form-input"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. Congolese, French"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">⛪ Religion / Faith</label>
              <input
                className="form-input"
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                placeholder="e.g. Catholic, Protestant, Islam, Traditional"
              />
            </div>

            <div className="form-group">
              <label className="form-label">📖 Biography</label>
              <textarea
                className="form-input form-textarea"
                rows={5}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Write a short biography — key life events, stories, memories..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">🔒 Internal Notes <span className="add-member__optional">(only visible to tree admins)</span></label>
              <textarea
                className="form-input form-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for your reference (sources, uncertainties, etc.)"
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="add-member__section">
            <h2 className="add-member__section-title">✅ Review & Confirm</h2>
            <p className="add-member__section-hint">Everything looks right? Press "Add Member" to save.</p>

            <div className="add-member__review">
              <ReviewRow label="Full Name"     value={`${firstName} ${maidenName ? `(née ${maidenName}) ` : ''}${lastName}`} />
              {nickname    && <ReviewRow label="Nickname"   value={nickname} />}
              {gender      && <ReviewRow label="Gender"     value={gender} />}
              <ReviewRow label="Date of Birth"  value={formatFuzzy(birthDate)} />
              {birthLocation  && <ReviewRow label="Place of Birth"  value={birthLocation} />}
              {currentLocation && <ReviewRow label="Current Location" value={currentLocation} />}
              <ReviewRow label="Living"         value={isAlive ? 'Yes' : 'Deceased'} />
              {!isAlive && <ReviewRow label="Date of Death"  value={formatFuzzy(deathDate)} />}
              {!isAlive && deathLocation && <ReviewRow label="Place of Death" value={deathLocation} />}
              <ReviewRow label="Show Age"       value={showAge ? 'Yes' : 'Hidden'} />
              {occupation  && <ReviewRow label="Occupation"  value={occupation} />}
              {nationality && <ReviewRow label="Nationality" value={nationality} />}
              {religion    && <ReviewRow label="Religion"    value={religion} />}
              {biography   && <ReviewRow label="Biography"   value={biography.slice(0, 80) + (biography.length > 80 ? '…' : '')} />}
            </div>

            <p className="add-member__review-note">
              📌 All information can be updated anytime from the member's profile page.
            </p>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="add-member__nav">
          {step > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
            >
              Next →
            </button>
          )}
          {step === STEPS.length - 1 && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Saving…' : '✅ Add Member'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function ReviewRow({ label, value }) {
  return (
    <div className="add-member__review-row">
      <span className="add-member__review-label">{label}</span>
      <span className="add-member__review-value">{value || '—'}</span>
    </div>
  );
}

export default AddMember;
