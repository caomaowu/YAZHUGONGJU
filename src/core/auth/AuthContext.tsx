import React, { useState, useEffect, type ReactNode } from 'react';
import type { User, AuthState } from './types';
import { AuthContext } from './authContextStore';

const AUTH_STORAGE_KEY = 'auth_data';
const AUTH_STORAGE_TTL_MS = 200 * 60 * 60 * 1000;

type StoredAuth = {
  token: string;
  user: User;
  expiresAt: number;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    roles: [],
    isAuthenticated: false,
    isLoading: true,
  });

  const clearStoredAuth = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const toUnauthenticatedState = (): AuthState => ({
    user: null,
    token: null,
    roles: [],
    isAuthenticated: false,
    isLoading: false,
  });

  const saveStoredAuth = (token: string, user: User, expiresAt?: number) => {
    const payload: StoredAuth = {
      token,
      user,
      expiresAt: typeof expiresAt === 'number' ? expiresAt : Date.now() + AUTH_STORAGE_TTL_MS,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  };

  const parseStoredAuth = (raw: string): StoredAuth | null => {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredAuth>;
      if (!parsed || typeof parsed.token !== 'string' || !parsed.user) return null;
      const expiresAt = Number(parsed.expiresAt);
      return {
        token: parsed.token,
        user: parsed.user as User,
        expiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : Date.now() + AUTH_STORAGE_TTL_MS,
      };
    } catch {
      return null;
    }
  };

  const fetchRoles = async (token: string) => {
    try {
      const response = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401 || response.status === 403) return false;
      if (response.ok) {
        const roles = await response.json();
        setState(prev => ({ ...prev, roles }));
        return true;
      }
      return true;
    } catch (e) {
      console.error('Failed to fetch roles', e);
      return true;
    }
  };

  const logout = () => {
    clearStoredAuth();
    setState(toUnauthenticatedState());
  };

  useEffect(() => {
    const initAuth = async () => {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const stored = parseStoredAuth(raw);
      if (!stored) {
        clearStoredAuth();
        setState(toUnauthenticatedState());
        return;
      }

      if (Date.now() >= stored.expiresAt) {
        clearStoredAuth();
        setState(toUnauthenticatedState());
        return;
      }

      try {
        const meResponse = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${stored.token}` }
        });
        if (!meResponse.ok) {
          clearStoredAuth();
          setState(toUnauthenticatedState());
          return;
        }

        const meUser = await meResponse.json().catch(() => null);
        const normalizedUser: User = {
          username: String(meUser?.username || stored.user.username || ''),
          role: String(meUser?.role || stored.user.role || ''),
          name: String(meUser?.name || stored.user.name || stored.user.username || ''),
        };

        saveStoredAuth(stored.token, normalizedUser, stored.expiresAt);
        setState(prev => ({
          ...prev,
          user: normalizedUser,
          token: stored.token,
          isAuthenticated: true,
        }));

        const rolesOk = await fetchRoles(stored.token);
        if (!rolesOk) {
          clearStoredAuth();
          setState(toUnauthenticatedState());
          return;
        }
      } catch (e) {
        console.error('Failed to restore auth state', e);
        clearStoredAuth();
        setState(toUnauthenticatedState());
        return;
      }

      setState(prev => ({ ...prev, isLoading: false }));
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    saveStoredAuth(token, user);
    setState(prev => ({
      ...prev,
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    }));
    void fetchRoles(token).then((ok) => {
      if (!ok) logout();
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
      const ok = await fetchRoles(state.token);
      if (!ok) logout();
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
};
