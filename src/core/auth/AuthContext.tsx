import React, { useState, useEffect, type ReactNode } from 'react';
import type { User, AuthState } from './types';
import { AuthContext } from './authContextStore';

const AUTH_STORAGE_KEY = 'auth_data';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    roles: [],
    isAuthenticated: false,
    isLoading: true,
  });

  const fetchRoles = async (token: string) => {
    try {
      const response = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const roles = await response.json();
        setState(prev => ({ ...prev, roles }));
      }
    } catch (e) {
      console.error('Failed to fetch roles', e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        try {
          const { token, user } = JSON.parse(storedAuth);
          setState(prev => ({
            ...prev,
            user,
            token,
            isAuthenticated: true,
          }));
          // Fetch roles immediately if logged in
          await fetchRoles(token);
        } catch (e) {
          console.error('Failed to parse auth data', e);
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      setState(prev => ({ ...prev, isLoading: false }));
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
    setState(prev => ({
      ...prev,
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    }));
    fetchRoles(token);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      user: null,
      token: null,
      roles: [],
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const hasPermission = (toolId: string) => {
    if (!state.user) return false;
    const userRole = state.roles.find(r => r.id === state.user!.role);
    if (!userRole) return false; // Role not found, deny by default
    
    if (userRole.permissions.includes('*')) return true; // Super admin
    return userRole.permissions.includes(toolId);
  };

  const refreshRoles = async () => {
    if (state.token) {
      await fetchRoles(state.token);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
};
