import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Notification } from '../types';
import { api, clearApiCache, getAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: any) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User>;
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Clean up any legacy shared localStorage token so tabs don't collide
  if (typeof window !== 'undefined' && localStorage.getItem('gram_token')) {
    try {
      localStorage.removeItem('gram_token');
    } catch {
      // ignore
    }
  }

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const fetchedUser = await api.getMe();
          setUser(fetchedUser);
          if (fetchedUser.themePreference === 'dark' || fetchedUser.themePreference === 'light') {
            const root = document.documentElement;
            if (fetchedUser.themePreference === 'dark') {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
            localStorage.setItem('panchayath_theme', fetchedUser.themePreference);
          }
          api.prefetchAllData(fetchedUser.role);
          try {
            const list = await api.getNotifications();
            if (Array.isArray(list)) {
              setNotifications(
                [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
              );
            }
          } catch {
            // Safe fallback
          }
        } catch (err) {
          console.error('Failed to load user session', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  // Periodic Notification Polling for live officer status updates
  useEffect(() => {
    if (!token || !user) return;
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [token, user]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const list = await api.getNotifications();
      if (Array.isArray(list)) {
        setNotifications(
          [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        );
      }
    } catch {
      // Gracefully handle periodic background network hiccups
    }
  };

  const markNotificationsAsRead = async () => {
    if (!token) return;
    try {
      await api.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!token) return;
    try {
      await api.clearAllNotifications();
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const login = async (credentials: any) => {
    try {
      clearApiCache();
      const res = await api.login(credentials);
      // Store session token ONLY in sessionStorage for isolated per-tab sessions
      sessionStorage.setItem('gram_token', res.token);
      setToken(res.token);
      setUser(res.user);
      if (res.user?.themePreference === 'dark' || res.user?.themePreference === 'light') {
        const root = document.documentElement;
        if (res.user.themePreference === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        localStorage.setItem('panchayath_theme', res.user.themePreference);
      }
      api.prefetchAllData(res.user.role);
      return res.user;
    } catch (err) {
      throw err;
    }
  };

  const register = async (data: any) => {
    try {
      const res = await api.register(data);
      // Store session token ONLY in sessionStorage for isolated per-tab sessions
      sessionStorage.setItem('gram_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('gram_token');
    try {
      localStorage.removeItem('gram_token');
    } catch {
      // ignore
    }
    clearApiCache();
    setToken(null);
    setUser(null);
    setNotifications([]);
    setLoading(false);
  };

  const refreshUser = async () => {
    try {
      const fetchedUser = await api.getMe();
      setUser(fetchedUser);
      return fetchedUser;
    } catch (err) {
      console.error('Error refreshing profile:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        notifications,
        fetchNotifications,
        markNotificationsAsRead,
        clearAllNotifications
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
