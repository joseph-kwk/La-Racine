import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register/', userData),
  login: (credentials) => api.post('/auth/token/', credentials),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
};

// Trees API
export const treeAPI = {
  getAllTrees: () => api.get('/trees/'),
  getTree: (id) => api.get(`/trees/${id}/`),
  createTree: (treeData) => api.post('/trees/', treeData),
  updateTree: (id, treeData) => api.put(`/trees/${id}/`, treeData),
  deleteTree: (id) => api.delete(`/trees/${id}/`),
};

// Family Members API
export const memberAPI = {
  getAllMembers: () => api.get('/familymembers/'),
  getMember: (id) => api.get(`/familymembers/${id}/`),
  createMember: (memberData) => api.post('/familymembers/', memberData),
  updateMember: (id, memberData) => api.put(`/familymembers/${id}/`, memberData),
  deleteMember: (id) => api.delete(`/familymembers/${id}/`),
};

// Notifications API
export const notificationAPI = {
  getAllNotifications: () => api.get('/notifications/'),
  markAsRead: (id) => api.put(`/notifications/${id}/`, { read: true }),
};

export default api;
