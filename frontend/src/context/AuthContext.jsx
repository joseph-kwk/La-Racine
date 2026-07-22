/**
 * context/AuthContext.jsx
 *
 * Provides authentication state + the user's full profile (including linked
 * family member, language preference, etc.) to the entire app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { AuthContext } from './auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Django User object
  const [profile, setProfile] = useState(null); // UserProfile object
  const [loading, setLoading] = useState(true);

  /** Fetch the current user + profile from /api/auth/me/ */
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await authAPI.me();
      setUser({
        id: data.id,
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        is_staff: data.is_staff,
      });
      setProfile(data.profile || null);
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, []);

  /** Bootstrap: restore session from localStorage on app load */
  useEffect(() => {
    const init = async () => {
      const access = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      if (!access || !refresh) {
        setLoading(false);
        return;
      }
      await fetchMe();
      setLoading(false);
    };
    init();
  }, [fetchMe]);

  const login = async (credentials) => {
    try {
      const { data } = await authAPI.login(credentials);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      await fetchMe();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await authAPI.register(userData);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      setUser({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        is_staff: false,
      });
      setProfile(data.profile || null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setProfile(null);
  };

  /** Update local profile state after a profile edit */
  const updateProfile = (updatedProfile) => {
    setProfile((prev) => ({ ...prev, ...updatedProfile }));
  };

  const value = {
    user,
    profile,
    login,
    register,
    logout,
    loading,
    updateProfile,
    fetchMe,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
