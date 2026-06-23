export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  customPermissions: string[];
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export const getPermissionsFromToken = (token: string | null): string[] => {
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  return (payload?.permissions as string[]) || [];
};

export const getUiModeFromToken = (token: string | null): 'ADMIN' | 'TECHNICIAN' => {
  if (!token) return 'ADMIN';
  const payload = decodeJwtPayload(token);
  return payload?.uiMode === 'TECHNICIAN' ? 'TECHNICIAN' : 'ADMIN';
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
