export type Role = string; // Now dynamic

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // List of tool IDs or "*"
  canEdit: boolean;
  canDelete: boolean;
}

export interface User {
  username: string;
  name: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  roles: RoleDefinition[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (toolId: string) => boolean;
  refreshRoles: () => Promise<void>;
}
