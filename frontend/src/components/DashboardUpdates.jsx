/**
 * components/DashboardUpdates.jsx
 *
 * Family social feed — rewired to use the real FamilyUpdate model
 * (was incorrectly using the legacy simple Update model).
 *
 * Features:
 * - Post updates with type selector
 * - Real like toggle (optimistic UI)
 * - Inline comment section with submit
 * - Full i18n via useTranslation
 * - No Tailwind classes, uses the design system
 * - No alert() calls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { familyUpdateAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const UPDATE_TYPES = [
  { value: 'news',         label: '📰 Family News',    icon: '📰' },
  { value: 'milestone',    label: '🏆 Milestone',      icon: '🏆' },
  { value: 'memorial',     label: '🕯️ Memorial',       icon: '🕯️' },
  { value: 'photo',        label: '📸 Photo Share',    icon: '📸' },
  { value: 'story',        label: '📖 Family Story',   icon: '📖' },
  { value: 'announcement', label: '📢 Announcement',   icon: '📢' },
];

function UpdateCard({ update, onLike, onCommentPost }) {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const typeInfo = UPDATE_TYPES.find(u => u.value === update.update_type) || UPDATE_TYPES[0];
  const timeStr = new Date(update.created_at).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const loadComments = useCallback(async () => {
    if (loadingComments || comments.length > 0) return;
    setLoadingComments(true);
    try {
      const { data } = await familyUpdateAPI.getComments(update.id);
      setComments(data.results ?? data);
    } catch {
      // fail silently
    } finally {
      setLoadingComments(false);
    }
  }, [update.id, comments.length]);

  const handleToggleComments = () => {
    setShowComments(prev => {
      if (!prev) loadComments();
      return !prev;
    });
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const { data } = await familyUpdateAPI.comment(update.id, commentText.trim());
      setComments(prev => [...prev, data]);
      setCommentText('');
      onCommentPost?.(update.id);
    } catch {
      // fail silently, comment input remains
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="update-card">
      <div className="update-card__header">
        <div className="update-card__avatar">
          {update.created_by_name?.[0] || '?'}
        </div>
        <div className="update-card__meta">
          <span className="update-card__author">{update.created_by_name || t('common.familyMember')}</span>
          <span className="update-card__time">{timeStr}</span>
        </div>
        <span className="update-card__type-badge">{typeInfo.icon} {typeInfo.label.split(' ').slice(1).join(' ')}</span>
      </div>

      {update.title && (
        <h3 className="update-card__title">{update.title}</h3>
      )}

      <p className="update-card__body">{update.content}</p>

      {update.featured_image && (
        <img src={update.featured_image} alt={update.title} className="update-card__image" />
      )}

      <div className="update-card__footer">
        <button
          className={`update-card__action ${update.liked_by_me ? 'update-card__action--liked' : ''}`}
          onClick={() => onLike(update.id)}
          aria-label={t('updates.like')}
        >
          {update.liked_by_me ? '❤️' : '🤍'} {update.likes_count || 0}
        </button>
        <button
          className="update-card__action"
          onClick={handleToggleComments}
          aria-expanded={showComments}
        >
          💬 {update.comments_count || 0}
        </button>
      </div>

      {showComments && (
        <div className="update-card__comments">
          {loadingComments ? (
            <div className="update-card__comments-loading"><div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /></div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="update-card__comment">
                <span className="update-card__comment-author">{c.author_username || c.author_name}</span>
                <span className="update-card__comment-text">{c.content}</span>
              </div>
            ))
          )}
          <form onSubmit={handleCommentSubmit} className="update-card__comment-form">
            <input
              className="form-input"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={t('updates.writeComment')}
              disabled={submittingComment}
            />
            <button type="submit" className="btn btn--primary btn--sm" disabled={submittingComment || !commentText.trim()}>
              {submittingComment ? <span className="btn-spinner" /> : t('updates.postComment')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const DashboardUpdates = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('news');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState('');

  const fetchUpdates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await familyUpdateAPI.getAll();
      setUpdates(data.results ?? data);
    } catch {
      setError(t('messages.errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsSubmitting(true);
    setPostError('');
    try {
      const { data } = await familyUpdateAPI.create({
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
        update_type: newType,
      });
      setUpdates(prev => [data, ...prev]);
      setNewTitle('');
      setNewContent('');
      setNewType('news');
    } catch (err) {
      const d = err.response?.data;
      setPostError(typeof d === 'string' ? d : d?.detail || d?.content?.[0] || t('messages.errorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (updateId) => {
    // Optimistic UI
    setUpdates(prev => prev.map(u => u.id === updateId
      ? { ...u, liked_by_me: !u.liked_by_me, likes_count: u.liked_by_me ? (u.likes_count - 1) : (u.likes_count + 1) }
      : u
    ));
    try {
      await familyUpdateAPI.like(updateId);
    } catch {
      // Revert on failure
      setUpdates(prev => prev.map(u => u.id === updateId
        ? { ...u, liked_by_me: !u.liked_by_me, likes_count: u.liked_by_me ? (u.likes_count - 1) : (u.likes_count + 1) }
        : u
      ));
    }
  };

  const handleCommentPost = (updateId) => {
    setUpdates(prev => prev.map(u => u.id === updateId
      ? { ...u, comments_count: (u.comments_count || 0) + 1 }
      : u
    ));
  };

  return (
    <div className="updates-content">
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">{t('dashboard.updates')}</h2>
          <button className="btn btn--ghost btn--sm" onClick={fetchUpdates} disabled={loading}>
            🔄 {t('common.refresh')}
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
            <button className="btn btn--ghost btn--sm" onClick={fetchUpdates} style={{ marginLeft: '1rem' }}>
              {t('messages.tryAgain')}
            </button>
          </div>
        )}

        {/* ── Compose Box ── */}
        <div className="update-compose">
          <div className="update-compose__avatar">
            {user?.first_name?.[0] || user?.username?.[0] || '?'}
          </div>
          <form onSubmit={handlePost} className="update-compose__form">
            <div className="update-compose__type-row">
              {UPDATE_TYPES.map(ut => (
                <button
                  key={ut.value}
                  type="button"
                  className={`update-compose__type-btn ${newType === ut.value ? 'update-compose__type-btn--active' : ''}`}
                  onClick={() => setNewType(ut.value)}
                >
                  {ut.icon}
                </button>
              ))}
            </div>
            <input
              className="form-input"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder={t('updates.titleOptional')}
              style={{ marginBottom: '0.5rem' }}
            />
            <textarea
              className="form-input"
              rows={3}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder={t('updates.whatsNew')}
              required
            />
            {postError && <p className="form-error">⚠️ {postError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting || !newContent.trim()}
              >
                {isSubmitting ? (
                  <span className="auth-loading-inner"><span className="btn-spinner" />{t('updates.posting')}</span>
                ) : `📢 ${t('updates.postUpdate')}`}
              </button>
            </div>
          </form>
        </div>

        {/* ── Feed ── */}
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p>{t('messages.loadingData')}</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="empty-state" style={{ border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: '3rem' }}>
            <div className="empty-state-icon">📰</div>
            <h3 className="empty-state-title">{t('updates.noUpdates')}</h3>
            <p className="empty-state-text">{t('updates.beFirst')}</p>
          </div>
        ) : (
          <div className="updates-feed">
            {updates.map(u => (
              <UpdateCard
                key={u.id}
                update={u}
                onLike={handleLike}
                onCommentPost={handleCommentPost}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardUpdates;
