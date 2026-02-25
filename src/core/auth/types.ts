export type Role = 'admin' | 'engineer' | 'operator' | 'viewer';

export interface User {
  username: string;
  name: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (requiredRoles: Role[]) => boolean;
}
