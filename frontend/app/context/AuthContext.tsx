'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, phone: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
        } catch {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api';
  const mockStorageKey = 'mock_users';

  const getMockUsers = () => {
    // Clear old data without role field if it exists
    const stored = localStorage.getItem(mockStorageKey);
    if (stored) {
      try {
        const users = JSON.parse(stored);
        // Check if any user is missing the role field, if so, reinitialize
        if (users.some((u: { role?: string }) => !u.role)) {
          localStorage.removeItem(mockStorageKey);
        } else {
          return users as Array<{
            id: string;
            email: string;
            password: string;
            name: string;
            phone: string;
            role: string;
          }>;
        }
      } catch {
        localStorage.removeItem(mockStorageKey);
      }
    }
    
    // Initialize fresh demo users
    const demoUsers = [
      {
        id: 'parent-1',
        email: 'parent@example.com',
        password: 'Password123!',
        name: 'Demo Parent',
        phone: '+91 98765 43210',
        role: 'parent',
      },
      {
        id: 'admin-1',
        email: 'admin@lmsedu.com',
        password: 'Password123!',
        name: 'Admin User',
        phone: '+91 98765 43211',
        role: 'admin',
      },
    ];
    localStorage.setItem(mockStorageKey, JSON.stringify(demoUsers));
    return demoUsers;
  };

  const saveMockUsers = (users: Array<{
    id: string;
    email: string;
    password: string;
    name: string;
    phone: string;
    role: string;
  }>) => {
    localStorage.setItem(mockStorageKey, JSON.stringify(users));
  };

  const mockLogin = async (email: string, password: string) => {
    const users = getMockUsers();
    const user = users.find((item) => item.email === email && item.password === password);
    if (!user) {
      // Log for debugging
      console.error('Invalid credentials. Available users:', users.map(u => ({ email: u.email, role: u.role })));
      console.error('Attempted login:', { email, password });
      throw new Error('Invalid credentials for mock auth');
    }
    return {
      token: `mock-token-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  };

  const mockRegister = async (email: string, password: string, name: string, phone: string) => {
    const users = getMockUsers();
    if (users.some((item) => item.email === email)) {
      throw new Error('An account with this email already exists in mock auth');
    }
    const newUser = {
      id: `parent-${Date.now()}`,
      email,
      password,
      name,
      phone,
      role: 'parent',
    };
    const nextUsers = [...users, newUser];
    saveMockUsers(nextUsers);
    return {
      token: `mock-token-${newUser.id}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
      },
    };
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Login failed');
      }

      const data = await response.json();
      const { token, user: userData } = data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      // Use fallback to mock auth for development
      if (message.match(/network|failed to fetch|fetch|ECONNREFUSED|ERR/i) || message.includes('Login failed')) {
        try {
          const data = await mockLogin(email, password);
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        } catch (mockErr) {
          const mockMessage = mockErr instanceof Error ? mockErr.message : 'Mock login failed';
          setError(mockMessage);
          throw mockErr;
        }
      } else {
        setError(message);
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, phone: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Registration failed');
      }

      const data = await response.json();
      const { token, user: userData } = data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (message.match(/network|failed to fetch|fetch/i)) {
        const data = await mockRegister(email, password, name, phone);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        setError(message);
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  const updateProfile = async (name: string, phone: string) => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, phone }),
      });
      if (!response.ok) throw new Error('Update failed');
      const data = await response.json();
      const updated = { ...user, ...(data.user ?? { name, phone }) } as User;
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch {
      const updated = { ...user, name, phone } as User;
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, new_password_confirmation: newPassword }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Password change failed');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    loginModalOpen,
    openLoginModal,
    closeLoginModal,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
