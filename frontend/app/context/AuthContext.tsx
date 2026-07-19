'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getAuthToken } from '@/lib/apiClient';

interface User { id: string; email: string; name: string; phone: string; role?: string; access_level?: 'super_admin' | 'admin' | 'operator'; permissions?: Record<string, string[]> }
interface AuthResponse { token: string; user: User }
interface AuthContextType {
  user: User | null; isAuthenticated: boolean; isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => void; updateProfile: (name: string, phone: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  loginModalOpen: boolean; openLoginModal: () => void; closeLoginModal: () => void;
  error: string | null; clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const clearSession = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('lms_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  useEffect(() => {
    const token = getAuthToken() || localStorage.getItem('lms_token');
    if (!token) { setIsLoading(false); return; }
    apiFetch<{ user: User }>('/auth/me', {}, token)
      .then(({ user: verified }) => {
        localStorage.setItem('auth_token', token);
        localStorage.removeItem('lms_token');
        localStorage.setItem('user', JSON.stringify(verified));
        setUser(verified);
      })
      .catch(clearSession)
      .finally(() => setIsLoading(false));
  }, []);

  const storeSession = ({ token, user: nextUser }: AuthResponse) => {
    localStorage.setItem('auth_token', token);
    localStorage.removeItem('lms_token');
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const runAuth = async (path: string, body: object) => {
    setError(null); setIsLoading(true);
    try { storeSession(await apiFetch<AuthResponse>(path, { method: 'POST', body: JSON.stringify(body) }, null)); }
    catch (err) { const message = err instanceof Error ? err.message : 'Authentication failed'; setError(message); throw err; }
    finally { setIsLoading(false); }
  };

  const login = (email: string, password: string) => runAuth('/auth/login', { email, password });
  const register = (email: string, password: string, name: string, phone: string) =>
    runAuth('/auth/register', { email, password, name, phone });

  const logout = () => {
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession(); setError(null);
  };

  const updateProfile = async (name: string, phone: string) => {
    const data = await apiFetch<{ user: User }>('/auth/me', { method: 'PUT', body: JSON.stringify({ name, phone }) });
    localStorage.setItem('user', JSON.stringify(data.user)); setUser(data.user);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify({
      current_password: currentPassword, new_password: newPassword, new_password_confirmation: newPassword,
    }) });
  };

  return <AuthContext.Provider value={{
    user, isAuthenticated: !!user, isLoading, login, register, logout, updateProfile, changePassword,
    loginModalOpen, openLoginModal: () => setLoginModalOpen(true), closeLoginModal: () => setLoginModalOpen(false),
    error, clearError: () => setError(null),
  }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
