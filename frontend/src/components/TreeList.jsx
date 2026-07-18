/**
 * components/TreeList.jsx
 *
 * Displays all trees the user has access to.
 * Fixed: uses centralized treeAPI service instead of raw fetch(),
 * proper inline delete confirmation instead of browser confirm(),
 * i18n throughout, CSS spinner.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { treeAPI } from '../services/api';

const TreeList = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trees, setTrees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    setIsLoading(true);
    try {
      const { data } = await treeAPI.getAll();
      setTrees(data.results ?? data);
    } catch {
      setError(t('messages.errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTree = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await treeAPI.delete(confirmDelete.id);
      setTrees(prev => prev.filter(t => t.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch {
      setError(t('messages.errorOccurred'));
    } finally {
      setDeleting(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':   return '👑';
      case 'editor':  return '✏️';
      case 'viewer':  return '👁️';
      default:        return '👤';
    }
  };

  return (
    <div className="dashboard-container">
      {/* ── Header ── */}
      <div className="tree-list-header">
        <div>
          <h1 className="tree-list-title">🌲 {t('dashboard.yourFamilyTrees')}</h1>
          <p className="tree-list-subtitle">{t('common.welcome')}, {user?.username}</p>
        </div>
        <div className="tree-list-header-actions">
          <Link to="/trees/new" className="btn btn--primary">
            + {t('dashboard.createNewTree')}
          </Link>
          <button onClick={() => navigate('/dashboard')} className="btn btn--ghost">
            ← {t('common.back')}
          </button>
        </div>
      </div>

      <main className="dashboard-main">
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>⚠️ {error}</span>
            <button className="btn btn--ghost" onClick={() => { setError(''); fetchTrees(); }}>{t('messages.tryAgain')}</button>
          </div>
        )}

        {/* ── Inline delete confirmation ── */}
        {confirmDelete && (
          <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label={t('common.confirm')}>
            <div className="confirm-dialog">
              <div className="confirm-dialog__icon">⚠️</div>
              <h3 className="confirm-dialog__title">{t('tree.deleteConfirmTitle')}</h3>
              <p className="confirm-dialog__body">
                {t('tree.deleteConfirmBody', { name: confirmDelete.name })}
              </p>
              <div className="confirm-dialog__actions">
                <button className="btn btn--ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                  {t('common.cancel')}
                </button>
                <button className="btn btn--danger" onClick={handleDeleteTree} disabled={deleting}>
                  {deleting ? (
                    <span className="auth-loading-inner"><span className="btn-spinner" />{t('common.deleting')}</span>
                  ) : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p className="empty-state-text">{t('dashboard.loadingDashboard')}</p>
          </div>
        ) : trees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌱</div>
            <h3 className="empty-state-title">{t('dashboard.noTreesYet')}</h3>
            <p className="empty-state-text">{t('dashboard.createFirstTree')}</p>
            <Link to="/trees/new" className="btn btn--primary" style={{ marginTop: '1rem' }}>
              {t('dashboard.createYourFirstTree')}
            </Link>
          </div>
        ) : (
          <div className="enhanced-tree-grid">
            {trees.map(tree => (
              <div key={tree.id} className="enhanced-tree-card">
                <div className="tree-card-header">
                  <div className="tree-title-section">
                    <span className="tree-type-icon">🌳</span>
                    <h3 className="tree-card-title">{tree.name}</h3>
                  </div>
                  <div className={`role-badge role-${tree.role}`}>
                    {getRoleIcon(tree.role)} {tree.role}
                  </div>
                </div>

                {tree.description && (
                  <p className="tree-card-description">{tree.description}</p>
                )}

                <div className="tree-stats">
                  <div className="tree-stat">
                    <span className="stat-number">{tree.member_count || 0}</span>
                    <span className="stat-label">{t('tree.members')}</span>
                  </div>
                  <div className="tree-stat">
                    <span className="stat-number">{tree.relationship_count || 0}</span>
                    <span className="stat-label">{t('tree.relationships')}</span>
                  </div>
                </div>

                <div className="tree-card-actions">
                  <Link to={`/trees/${tree.id}`} className="btn btn--primary btn--sm">
                    🌳 {t('tree.viewTree')}
                  </Link>
                  {(tree.role === 'owner' || tree.role === 'editor') && (
                    <Link to={`/trees/${tree.id}/members/new`} className="btn btn--outline btn--sm">
                      ✏️ {t('member.addMember')}
                    </Link>
                  )}
                  {tree.role === 'owner' && (
                    <Link to={`/trees/${tree.id}/settings`} className="btn btn--outline btn--sm">
                      ⚙️ {t('common.settings')}
                    </Link>
                  )}
                  {tree.role === 'owner' && (
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => setConfirmDelete({ id: tree.id, name: tree.name })}
                    >
                      🗑️ {t('common.delete')}
                    </button>
                  )}
                </div>

                <div className="tree-card-footer">
                  <span className="tree-card-date">
                    {t('tree.lastUpdated')}: {new Date(tree.updated_at || tree.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TreeList;
