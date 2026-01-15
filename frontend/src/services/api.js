import axios from 'axios';

// Prefer env var, fallback to localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh access token on 401 and retry the original request
let isRefreshing = false;
let pendingRequests = [];

const processQueue = (error, token = null) => {
  pendingRequests.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  pendingRequests = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      // Already retried once
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue the request until refresh completes
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const { data } = await api.post('/auth/token/refresh/', { refresh });
      const newAccess = data.access;
      if (newAccess) {
        localStorage.setItem('access_token', newAccess);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      }
      processQueue(error, null);
      return Promise.reject(error);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Gentle logout: clear tokens so the app falls back to logged-out state
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register/', userData),
  login: (credentials) => api.post('/auth/token/', credentials),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
  me: () => api.get('/auth/me/'),
};

// Trees API
export const treeAPI = {
  getAllTrees: () => api.get('/trees/'),
  getTree: (id) => api.get(`/trees/${id}/`),
  createTree: (treeData) => api.post('/trees/', treeData),
  updateTree: (id, treeData) => api.put(`/trees/${id}/`, treeData),
  deleteTree: (id) => api.delete(`/trees/${id}/`),
  getTreeMembers: (id) => api.get(`/trees/${id}/members/`),
};

// Family Members API
export const memberAPI = {
  getAllMembers: () => api.get('/members/'),
  getMember: (id) => api.get(`/members/${id}/`),
  createMember: (memberData) => api.post('/members/', memberData),
  updateMember: (id, memberData) => api.put(`/members/${id}/`, memberData),
  deleteMember: (id) => api.delete(`/members/${id}/`),
};

// Notifications API
export const notificationAPI = {
  getAllNotifications: () => api.get('/notifications/'),
  markAsRead: (id) => api.put(`/notifications/${id}/`, { read: true }),
};

// Updates API
export const updateAPI = {
  getAllUpdates: () => api.get('/updates/'),
  createUpdate: (updateData) => api.post('/updates/', updateData),
  deleteUpdate: (id) => api.delete(`/updates/${id}/`),
};

export default api;
