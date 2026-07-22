/**
 * components/TreeSettings.jsx
 *
 * Full settings page for a tree, at /trees/:treeId/settings
 *
 * Sections:
 *  📋 General    — name, description, privacy, language
 *  🎨 Identity   — ThemePicker (palette + crest)
 *  ⚙️ Governance — approval toggles
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { treeAPI, invitationAPI } from '../services/api';
import ThemePicker from './ThemePicker';
import TreeThemeProvider from './TreeThemeProvider';

const SECTIONS = [
  { id: 'general',    icon: '📋', label: 'General' },
  { id: 'identity',   icon: '🎨', label: 'Family Identity' },
  { id: 'invite',     icon: '✉️', label: 'Invite Members' },
  { id: 'governance', icon: '⚙️', label: 'Governance' },
];

const PRIVACY_OPTIONS = [
  { value: 'private',  label: '🔒 Private',     desc: 'Only invited members can see this tree' },
  { value: 'family',   label: '👨‍👩‍👧‍👦 Family',      desc: 'Visible to all confirmed family members' },
  { value: 'public',   label: '🌍 Public',       desc: 'Anyone with the link can view (read-only)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en',  label: '🇬🇧 English' },
  { value: 'fr',  label: '🇫🇷 Français' },
  { value: 'es',  label: '🇪🇸 Español' },
  { value: 'pt',  label: '🇧🇷 Português' },
  { value: 'ar',  label: '🇸🇦 العربية' },
  { value: 'sw',  label: '🌍 Kiswahili' },
  { value: 'ln',  label: '🌍 Lingála' },
  { value: 'kg',  label: '🌍 Kikongo' },
  { value: 'zh',  label: '🇨🇳 中文' },
  { value: 'hi',  label: '🇮🇳 हिन्दी' },
  { value: 'de',  label: '🇩🇪 Deutsch' },
  { value: 'ru',  label: '🇷🇺 Русский' },
];

const TreeSettings = () => {
  const { treeId } = useParams();
  const navigate = useNavigate();


  const [tree, setTree]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [activeSection, setActiveSection] = useState('general');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteName, setInviteName]       = useState('');
  const [inviteRole, setInviteRole]       = useState('viewer');
  const [inviteMsg, setInviteMsg]         = useState('');
  const [sending, setSending]             = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  // General form fields
  const [name, setName]                     = useState('');
  const [description, setDescription]       = useState('');
  const [privacyLevel, setPrivacyLevel]     = useState('private');
  const [primaryLanguage, setPrimaryLanguage] = useState('en');

  // Governance
  const [requireApproval, setRequireApproval] = useState(true);
  const [allowInvites, setAllowInvites]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await treeAPI.get(treeId);
        setTree(data);
        setName(data.name || '');
        setDescription(data.description || '');
        setPrivacyLevel(data.privacy_level || 'private');
        setPrimaryLanguage(data.primary_language || 'en');
        setRequireApproval(data.require_approval_for_edits ?? true);
        setAllowInvites(data.allow_member_invites ?? true);
      } catch {
        setError('Could not load tree settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [treeId]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  // ── Save General ──────────────────────────────────────────────────────────
  const saveGeneral = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Tree name is required.'); return; }
    setError('');
    setSaving(true);
    try {
      const { data } = await treeAPI.update(treeId, {
        name: name.trim(),
        description,
        privacy_level: privacyLevel,
        primary_language: primaryLanguage,
      });
      setTree(data);
      flash('✅ General settings saved.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // ── Save Governance ───────────────────────────────────────────────────────
  const saveGovernance = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await treeAPI.update(treeId, {
        require_approval_for_edits: requireApproval,
        allow_member_invites: allowInvites,
      });
      setTree(data);
      flash('✅ Governance settings saved.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // ── Save Theme (called from ThemePicker) ──────────────────────────────────
  const saveTheme = async (themePayload, crestFile, crestCaption) => {
    // 1. Save theme colors
    const { data: updated } = await treeAPI.updateTheme(treeId, themePayload);
    let finalTree = updated;

    // 2. Upload crest if a new file was selected
    if (crestFile || crestCaption !== (tree?.crest_caption || '')) {
      const fd = new FormData();
      if (crestFile) fd.append('crest_image', crestFile);
      fd.append('crest_caption', crestCaption);
      const { data: withCrest } = await treeAPI.uploadCrest(treeId, fd);
      finalTree = withCrest;
    }

    setTree(finalTree);
    flash('✅ Family identity saved.');
  };

  // ── Delete Tree ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await treeAPI.delete(treeId);
      navigate('/trees');
    } catch {
      setError('Could not delete tree. Only the owner can do this.');
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // ── Send Invitation ────────────────────────────────────────────────────────
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    setError('');
    setInviteSuccess('');
    try {
      await invitationAPI.create({
        tree: parseInt(treeId),
        invited_email: inviteEmail.trim(),
        invited_name: inviteName.trim(),
        role: inviteRole,
        invitation_message: inviteMsg.trim(),
      });
      setInviteSuccess(`✅ Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteName('');
      setInviteMsg('');
      setInviteRole('viewer');
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === 'string' ? d : d?.detail || d?.invited_email?.[0] || 'Failed to send invitation.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="tree-settings__loading">
        <div className="loading-spinner" />
        <p>Loading settings…</p>
      </div>
    );
  }

  return (
    <TreeThemeProvider tree={tree}>
      <div className="tree-settings">
        {/* Header */}
        <div className="tree-settings__hero">
          <Link to={`/trees/${treeId}`} className="tree-settings__back">← Back to {tree?.name}</Link>
          <h1 className="tree-settings__title">⚙️ Tree Settings</h1>
          <p className="tree-settings__subtitle">Manage your family tree's identity, privacy, and governance.</p>
        </div>

        <div className="tree-settings__layout">
          {/* Sidebar nav */}
          <nav className="tree-settings__sidebar">
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                type="button"
                className={`tree-settings__nav-item ${activeSection === sec.id ? 'tree-settings__nav-item--active' : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <span className="tree-settings__nav-icon">{sec.icon}</span>
                {sec.label}
              </button>
            ))}
          </nav>

          {/* Content panel */}
          <div className="tree-settings__panel">
            {/* Global alerts */}
            {error   && <div className="tree-settings__alert tree-settings__alert--error">⚠️ {error}</div>}
            {success && <div className="tree-settings__alert tree-settings__alert--success">{success}</div>}

            {/* ── General ── */}
            {activeSection === 'general' && (
              <form className="tree-settings__section" onSubmit={saveGeneral}>
                <h2 className="tree-settings__section-title">📋 General</h2>

                <div className="form-group">
                  <label className="form-label">Tree Name <span className="add-member__required">*</span></label>
                  <input
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. The Kasongo Family"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A short description of this family tree…"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Privacy Level</label>
                  <div className="tree-settings__privacy-options">
                    {PRIVACY_OPTIONS.map(opt => (
                      <label key={opt.value} className={`tree-settings__privacy-card ${privacyLevel === opt.value ? 'tree-settings__privacy-card--active' : ''}`}>
                        <input
                          type="radio"
                          name="privacy"
                          value={opt.value}
                          checked={privacyLevel === opt.value}
                          onChange={() => setPrivacyLevel(opt.value)}
                          style={{ display: 'none' }}
                        />
                        <div className="tree-settings__privacy-label">{opt.label}</div>
                        <div className="tree-settings__privacy-desc">{opt.desc}</div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ maxWidth: '280px' }}>
                  <label className="form-label">Primary Language</label>
                  <select
                    className="form-input form-input--select"
                    value={primaryLanguage}
                    onChange={(e) => setPrimaryLanguage(e.target.value)}
                  >
                    {LANGUAGE_OPTIONS.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <p className="add-member__field-hint">Used for data entry and future multilingual features.</p>
                </div>

                <div className="tree-settings__form-actions">
                  <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? '⏳ Saving…' : '💾 Save General Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Family Identity ── */}
            {activeSection === 'identity' && (
              <div className="tree-settings__section">
                <h2 className="tree-settings__section-title">🎨 Family Identity</h2>
                <p className="tree-settings__section-hint">
                  Choose colors and an emblem that represent your family's heritage. All members will see your chosen theme.
                </p>
                <ThemePicker
                  tree={tree}
                  onSave={saveTheme}
                  readOnly={false}
                />
              </div>
            )}

            {/* ── Invite Members ── */}
            {activeSection === 'invite' && (
              <div className="tree-settings__section">
                <h2 className="tree-settings__section-title">✉️ Invite Members</h2>
                <p className="tree-settings__section-hint">
                  Send an email invitation to a family member. They'll get a link to join this tree with the role you choose.
                </p>

                {inviteSuccess && (
                  <div className="tree-settings__alert tree-settings__alert--success">{inviteSuccess}</div>
                )}

                <form onSubmit={handleSendInvite}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="ts-email" className="form-label">Email address <span className="add-member__required">*</span></label>
                      <input
                        id="ts-email"
                        type="email"
                        className="form-input"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="family.member@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ts-name" className="form-label">Their name <span className="add-member__optional">(optional)</span></label>
                      <input
                        id="ts-name"
                        type="text"
                        className="form-input"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder="e.g. Marie Kasongo"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ maxWidth: '240px' }}>
                    <label htmlFor="ts-role" className="form-label">Role</label>
                    <select
                      id="ts-role"
                      className="form-input form-input--select"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="viewer">👁️ Viewer — read only</option>
                      <option value="editor">✏️ Editor — can add/edit members</option>
                      <option value="validator">✅ Validator — can approve changes</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ts-msg" className="form-label">Personal message <span className="add-member__optional">(optional)</span></label>
                    <textarea
                      id="ts-msg"
                      className="form-input form-textarea"
                      rows={3}
                      value={inviteMsg}
                      onChange={e => setInviteMsg(e.target.value)}
                      placeholder="Add a personal note to the invitation email…"
                    />
                  </div>

                  <div className="tree-settings__form-actions">
                    <button type="submit" className="btn btn--primary" disabled={sending || !inviteEmail.trim()}>
                      {sending ? (
                        <span className="auth-loading-inner"><span className="btn-spinner" /> Sending…</span>
                      ) : '✉️ Send Invitation'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Governance ── */}
            {activeSection === 'governance' && (
              <form className="tree-settings__section" onSubmit={saveGovernance}>
                <h2 className="tree-settings__section-title">⚙️ Governance</h2>
                <p className="tree-settings__section-hint">
                  Control how edits are approved and who can invite new members.
                </p>

                <div className="tree-settings__toggle-group">
                  <label className="tree-settings__toggle-row">
                    <div className="tree-settings__toggle-text">
                      <strong>Require approval for edits</strong>
                      <p>All proposed changes go through a validator review before being applied.</p>
                    </div>
                    <div
                      className={`tree-settings__toggle-switch ${requireApproval ? 'tree-settings__toggle-switch--on' : ''}`}
                      onClick={() => setRequireApproval(!requireApproval)}
                    >
                      <div className="tree-settings__toggle-knob" />
                    </div>
                  </label>

                  <label className="tree-settings__toggle-row">
                    <div className="tree-settings__toggle-text">
                      <strong>Allow editors to invite members</strong>
                      <p>Editors can send invitations — not just owners and validators.</p>
                    </div>
                    <div
                      className={`tree-settings__toggle-switch ${allowInvites ? 'tree-settings__toggle-switch--on' : ''}`}
                      onClick={() => setAllowInvites(!allowInvites)}
                    >
                      <div className="tree-settings__toggle-knob" />
                    </div>
                  </label>
                </div>

                <div className="tree-settings__form-actions">
                  <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? (
                      <span className="auth-loading-inner"><span className="btn-spinner" /> Saving…</span>
                    ) : '💾 Save Governance'}
                  </button>
                </div>

                {/* Danger zone */}
                <div className="tree-settings__danger-zone">
                  <h3 className="tree-settings__danger-title">⚠️ Danger Zone</h3>
                  <p>Deleting this tree is permanent and cannot be undone. All members, relationships, and media will be removed.</p>
                  {!confirmDeleteOpen ? (
                    <button type="button" className="btn btn--danger" onClick={() => setConfirmDeleteOpen(true)}>
                      🗑️ Delete This Tree
                    </button>
                  ) : (
                    <div className="confirm-dialog" style={{ marginTop: '1rem' }}>
                      <p><strong>Are you absolutely sure?</strong> Type the tree name to confirm:</p>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn--ghost" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
                          Cancel
                        </button>
                        <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
                          {deleting ? (
                            <span className="auth-loading-inner"><span className="btn-spinner" /> Deleting…</span>
                          ) : '⚠️ Yes, permanently delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </TreeThemeProvider>
  );
};

export default TreeSettings;
