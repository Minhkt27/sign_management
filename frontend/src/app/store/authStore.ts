export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  customPermissions: string[];
}

export const getPermissionsFromToken = (token: string | null): string[] => {
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.permissions || [];
  } catch {
    return [];
  }
};

export const authStore = {
  getUser: (): AuthUser | null => {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: AuthUser | null) => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  },
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },
  getRefreshToken: (): string | null => {
    return localStorage.getItem('auth_refresh_token');
  },
  setRefreshToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('auth_refresh_token', token);
    } else {
      localStorage.removeItem('auth_refresh_token');
    }
  },
  logout: () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
  },
};
