/**
 * services/api.js — La Racine API Service Layer
 *
 * Covers all backend endpoints:
 * - Auth (register, login, me)
 * - UserProfile
 * - Trees
 * - FamilyMembers + Relationships
 * - ChangeRequests + Validators
 * - Notifications
 * - FamilyPhotos
 * - FamilyUpdates (social feed)
 * - TreeInvitations
 * - LifeEvents
 * - FuzzyDates
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT access token to every request ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 and retry ────────────────────────────────────────────
let isRefreshing = false;
let pendingRequests = [];

const processQueue = (error, token = null) => {
  pendingRequests.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  pendingRequests = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || error.response?.status !== 401) return Promise.reject(error);
    if (originalRequest._retry) return Promise.reject(error);
    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) { isRefreshing = false; return Promise.reject(error); }

    try {
      const { data } = await api.post('/auth/token/refresh/', { refresh });
      if (data.access) {
        localStorage.setItem('access_token', data.access);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      }
      processQueue(error, null);
      return Promise.reject(error);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/token/', data),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
};

// ────────────────────────────────────────────────────────────────────────────
// UserProfile
// ────────────────────────────────────────────────────────────────────────────
export const profileAPI = {
  getMyProfile: () => api.get('/userprofiles/me/'),
  updateMyProfile: (data) => api.patch('/userprofiles/me/', data),
  claimMember: (memberId) => api.post('/userprofiles/claim-member/', { member_id: memberId }),
};

// ────────────────────────────────────────────────────────────────────────────
// Trees
// ────────────────────────────────────────────────────────────────────────────
export const treeAPI = {
  getAll: (params) => api.get('/trees/', { params }),
  get: (id) => api.get(`/trees/${id}/`),
  create: (data) => api.post('/trees/', data),
  update: (id, data) => api.patch(`/trees/${id}/`, data),
  delete: (id) => api.delete(`/trees/${id}/`),

  getMembers: (treeId) => api.get(`/trees/${treeId}/members/`),
  getPermissions: (treeId) => api.get(`/trees/${treeId}/permissions/`),
  grantPermission: (treeId, data) => api.post(`/trees/${treeId}/permissions/grant/`, data),
  getUpdates: (treeId) => api.get(`/trees/${treeId}/updates/`),
  getPendingChanges: (treeId) => api.get(`/trees/${treeId}/pending_changes/`),
};

// ────────────────────────────────────────────────────────────────────────────
// Family Members
// ────────────────────────────────────────────────────────────────────────────
export const memberAPI = {
  getAll: (params) => api.get('/members/', { params }),
  get: (id) => api.get(`/members/${id}/`),
  create: (data) => api.post('/members/', data),
  update: (id, data) => api.patch(`/members/${id}/`, data),
  delete: (id) => api.delete(`/members/${id}/`),

  getRelationships: (id) => api.get(`/members/${id}/relationships/`),
  addRelationship: (id, data) => api.post(`/members/${id}/relationships/`, data),

  proposeChange: (id, data) => api.post(`/members/${id}/propose-change/`, data),
  getChangeRequests: (id) => api.get(`/members/${id}/change_requests/`),

  getPrivacy: (id) => api.get(`/members/${id}/privacy/`),
  updatePrivacy: (id, data) => api.patch(`/members/${id}/privacy/`, data),

  getValidators: (id) => api.get(`/members/${id}/validators/`),
};

// ────────────────────────────────────────────────────────────────────────────
// FuzzyDates
// ────────────────────────────────────────────────────────────────────────────
export const fuzzyDateAPI = {
  create: (data) => api.post('/fuzzy-dates/', data),
  get: (id) => api.get(`/fuzzy-dates/${id}/`),
  update: (id, data) => api.patch(`/fuzzy-dates/${id}/`, data),
};

// ────────────────────────────────────────────────────────────────────────────
// Relationships
// ────────────────────────────────────────────────────────────────────────────
export const relationshipAPI = {
  getAll: () => api.get('/relationships/'),
  create: (data) => api.post('/relationships/', data),
  delete: (id) => api.delete(`/relationships/${id}/`),
};

// ────────────────────────────────────────────────────────────────────────────
// Change Requests
// ────────────────────────────────────────────────────────────────────────────
export const changeRequestAPI = {
  getAll: (params) => api.get('/change-requests/', { params }),
  get: (id) => api.get(`/change-requests/${id}/`),
  approve: (id, notes) => api.post(`/change-requests/${id}/approve/`, { review_notes: notes }),
  reject: (id, notes) => api.post(`/change-requests/${id}/reject/`, { review_notes: notes }),
  withdraw: (id) => api.post(`/change-requests/${id}/withdraw/`),
};

// ────────────────────────────────────────────────────────────────────────────
// Validators
// ────────────────────────────────────────────────────────────────────────────
export const validatorAPI = {
  getAll: () => api.get('/validators/'),
  create: (data) => api.post('/validators/', data),
  delete: (id) => api.delete(`/validators/${id}/`),
};

// ────────────────────────────────────────────────────────────────────────────
// Notifications
// ────────────────────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll: (params) => api.get('/notifications/', { params }),
  getUnread: () => api.get('/notifications/', { params: { unread: 'true' } }),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
  markRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/mark-all-read/'),
};

// ────────────────────────────────────────────────────────────────────────────
// Family Photos
// ────────────────────────────────────────────────────────────────────────────
export const photoAPI = {
  getAll: (params) => api.get('/photos/', { params }),
  get: (id) => api.get(`/photos/${id}/`),
  upload: (formData) => api.post('/photos/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/photos/${id}/`),
  tag: (id, data) => api.post(`/photos/${id}/tag/`, data),
};

// ────────────────────────────────────────────────────────────────────────────
// Family Updates (social feed)
// ────────────────────────────────────────────────────────────────────────────
export const familyUpdateAPI = {
  getAll: (params) => api.get('/family-updates/', { params }),
  create: (data) => api.post('/family-updates/', data),
  update: (id, data) => api.patch(`/family-updates/${id}/`, data),
  delete: (id) => api.delete(`/family-updates/${id}/`),
  like: (id) => api.post(`/family-updates/${id}/like/`),
  comment: (id, content) => api.post(`/family-updates/${id}/comment/`, { content }),
  getComments: (id) => api.get(`/family-updates/${id}/comments/`),
};

// ────────────────────────────────────────────────────────────────────────────
// Tree Invitations
// ────────────────────────────────────────────────────────────────────────────
export const invitationAPI = {
  create: (data) => api.post('/invitations/', data),
  accept: (token) => api.post('/invitations/accept/', { token }),
  getAll: () => api.get('/invitations/'),
};

// ────────────────────────────────────────────────────────────────────────────
// Life Events
// ────────────────────────────────────────────────────────────────────────────
export const lifeEventAPI = {
  getAll: (params) => api.get('/life-events/', { params }),
  create: (data) => api.post('/life-events/', data),
  update: (id, data) => api.patch(`/life-events/${id}/`, data),
  delete: (id) => api.delete(`/life-events/${id}/`),
};

// ────────────────────────────────────────────────────────────────────────────
// Legacy (backward compat)
// ────────────────────────────────────────────────────────────────────────────
export const updateAPI = {
  getAllUpdates: () => api.get('/updates/'),
  createUpdate: (data) => api.post('/updates/', data),
  deleteUpdate: (id) => api.delete(`/updates/${id}/`),
};

// Alias for older code
export const getAllTrees = () => treeAPI.getAll();

export default api;
