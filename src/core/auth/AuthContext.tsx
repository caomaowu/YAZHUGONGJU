import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Role, AuthContextType, AuthState } from './types';

const AUTH_STORAGE_KEY = 'auth_data';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const initAuth = () => {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        try {
          const { token, user } = JSON.parse(storedAuth);
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch (e) {
          console.error('Failed to parse auth data', e);
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }

      // Development environment auto-login
      if (import.meta.env.DEV) {
        // Only auto-login if no existing auth data
        console.log('Dev mode detected: Using dev credentials if not logged in');
        
        // Try to fetch a real token from server for dev admin? 
        // Or just mock it but realize that API calls needing real token will fail.
        // The issue is: UserManagementPage calls /api/users which needs a REAL token.
        // But here we set 'dev-token' which is fake.
        
        // Solution: In dev mode, we should probably just let the user login normally 
        // OR we need to hardcode a real token mechanism (bad security).
        // Best approach: Disable auto-login for now so user can login with real admin/admin123
        // and get a REAL token to use with the API.
      }

      setState(prev => ({ ...prev, isLoading: false }));
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // If in dev mode, logout might just re-login on refresh unless we handle it.
    // But for now, let's just clear state.
    // To prevent auto-login loop in dev, we might need a flag "intentionallyLoggedOut"
    // but the user requirement is "no login required", so auto-login on refresh is fine.
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const hasPermission = (requiredRoles: Role[]) => {
    if (!state.user) return false;
    return requiredRoles.includes(state.user.role);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
