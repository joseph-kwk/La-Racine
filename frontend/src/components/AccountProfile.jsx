/**
 * components/AccountProfile.jsx
 *
 * The user's own account/profile settings page.
 * Allows editing display name, language, timezone, theme,
 * notification preferences, and linking to a family member profile.
 */

import React, { useState, useEffect } from 'react';
import { profileAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'sw', label: '🌍 Kiswahili' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Africa/Nairobi', 'Africa/Lagos', 'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney',
];

export default function AccountProfile() {
  const { user, profile, updateProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    profileAPI.getMyProfile()
      .then((res) => {
        setForm(res.data);
      })
      .catch(() => {
        if (profile) setForm(profile);
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await profileAPI.updateMyProfile(form);
      setForm(res.data);
      updateProfile(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <div className="account-profile__loading">Loading your profile…</div>;
  }

  return (
    <div className="account-profile">
      <div className="account-profile__hero">
        <div className="account-profile__avatar-wrap">
          {form.profile_photo ? (
            <img className="account-profile__avatar" src={form.profile_photo} alt="You" />
          ) : (
            <div className="account-profile__avatar-placeholder">
              {user?.first_name?.[0] || user?.username?.[0] || '?'}
            </div>
          )}
        </div>
        <div className="account-profile__hero-info">
          <h1 className="account-profile__name">{form.display_name || user?.username}</h1>
          <p className="account-profile__email">{user?.email}</p>
          {form.linked_member_id && (
            <p className="account-profile__linked">
              ✅ Linked to family member profile
            </p>
          )}
        </div>
      </div>

      <form className="account-profile__form" onSubmit={handleSave}>

        {/* ── Display Settings ── */}
        <section className="account-profile__section">
          <h2 className="account-profile__section-title">Display Settings</h2>
          <div className="account-profile__grid">
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                className="form-input"
                name="display_name"
                value={form.display_name || ''}
                onChange={handleChange}
                placeholder="How you appear to other family members"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nickname</label>
              <input
                className="form-input"
                name="nickname"
                value={form.nickname || ''}
                onChange={handleChange}
                placeholder="Optional nickname"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-input"
                name="bio"
                value={form.bio || ''}
                onChange={handleChange}
                rows={3}
                placeholder="A short bio about yourself"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current Location</label>
              <input
                className="form-input"
                name="current_location"
                value={form.current_location || ''}
                onChange={handleChange}
                placeholder="City, Country"
              />
            </div>
          </div>
        </section>

        {/* ── Preferences ── */}
        <section className="account-profile__section">
          <h2 className="account-profile__section-title">Preferences</h2>
          <div className="account-profile__grid">
            <div className="form-group">
              <label className="form-label">Language</label>
              <select
                className="form-input form-input--select"
                name="preferred_language"
                value={form.preferred_language || 'en'}
                onChange={handleChange}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select
                className="form-input form-input--select"
                name="timezone"
                value={form.timezone || 'UTC'}
                onChange={handleChange}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <select
                className="form-input form-input--select"
                name="theme_preference"
                value={form.theme_preference || 'system'}
                onChange={handleChange}
              >
                <option value="system">🖥️ Follow System</option>
                <option value="light">☀️ Light</option>
                <option value="dark">🌙 Dark</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Email Digest</label>
              <select
                className="form-input form-input--select"
                name="digest_frequency"
                value={form.digest_frequency || 'instant'}
                onChange={handleChange}
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className="account-profile__section">
          <h2 className="account-profile__section-title">Notification Preferences</h2>
          <div className="account-profile__toggle-grid">
            {[
              { key: 'notify_birthdays_email', label: '🎂 Birthday reminders (email)' },
              { key: 'notify_birthdays_push', label: '🎂 Birthday reminders (push)' },
              { key: 'notify_new_member_email', label: '👶 New member added (email)' },
              { key: 'notify_change_requests_email', label: '📝 Change request updates (email)' },
              { key: 'notify_photo_tags_email', label: '🏷️ Photo tag notifications (email)' },
              { key: 'notify_invitations_email', label: '🔗 Tree invitation emails' },
            ].map(({ key, label }) => (
              <label key={key} className="account-profile__toggle">
                <input
                  type="checkbox"
                  name={key}
                  checked={!!form[key]}
                  onChange={handleChange}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        {error && <p className="form-error">{error}</p>}

        <div className="account-profile__actions">
          {saved && <span className="account-profile__saved">✅ Saved!</span>}
          <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
