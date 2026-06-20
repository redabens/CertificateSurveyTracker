'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type UserType = {
  email: string;
  full_name: string;
  role: string;
  vessel_id: number | null;
};

type AuthContextType = {
  token: string | null;
  user: UserType | null;
  login: (token: string, user: UserType) => void;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('babor_token');
    const savedUser = localStorage.getItem('babor_user');
    if (savedToken && savedUser) {
      const timer = setTimeout(() => {
        setToken(savedToken);
        setUser(JSON.parse(savedUser) as UserType);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const login = (newToken: string, newUser: UserType) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('babor_token', newToken);
    localStorage.setItem('babor_user', JSON.stringify(newUser));
    router.push('/');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('babor_token');
    localStorage.removeItem('babor_user');
    router.push('/login');
  };

  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = (options.headers || {}) as Record<string, string>;
    options.headers = headers;
    // Base URL points to the NestJS backend
    const backendUrl = `http://localhost:3000/api${url.startsWith('/') ? '' : '/'}${url}`;
    
    const savedToken = token || localStorage.getItem('babor_token');
    if (savedToken) {
      headers['Authorization'] = `Bearer ${savedToken}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(backendUrl, options);
    
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Unauthorized');
    }
    
    return res;
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
