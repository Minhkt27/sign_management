export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  customPermissions: string[];
  /** true khi tài khoản đang dùng mật khẩu do quản trị viên đặt và chưa tự đổi. */
  mustChangePassword?: boolean;
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

// null = SUPER_ADMIN (không giới hạn viện nào) hoặc chưa đăng nhập.
export const getHospitalIdFromToken = (token: string | null): number | null => {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return typeof payload?.hospitalId === 'number' ? payload.hospitalId : null;
};

export const isSuperAdmin = (token: string | null): boolean => {
  return getPermissionsFromToken(token).includes('HOSPITAL_MANAGE');
};

export const HOSPITAL_ID_STORAGE_KEY = 'hospitalId';

/** Trang công khai cho người bệnh: chỉ đường (/map) và trang đích của mã QR (/scan). */
export const isPublicRoute = (): boolean => /^\/(map|scan)(\/|$)/.test(window.location.pathname);

// Trang công khai: viện lấy từ QR / GPS / chọn tay (sessionStorage) TRƯỚC, rồi mới tới viện của
// tài khoản đang đăng nhập (nếu có). Trước đây tài khoản luôn thắng nên nhân viên đang đăng
// nhập quét QR của viện khác thì báo "không xác định được vị trí", còn SUPER_ADMIN thì thấy
// dữ liệu của mọi viện trộn lẫn.
// Trang quản trị: lấy hospitalId từ JWT (null = SUPER_ADMIN, không gửi param).
export const resolveHospitalId = (): string | null => {
  const token = authStore.getToken();
  if (isPublicRoute()) {
    const fromQr = sessionStorage.getItem(HOSPITAL_ID_STORAGE_KEY);
    if (fromQr) return fromQr;
    const fromToken = getHospitalIdFromToken(token);
    return fromToken != null ? String(fromToken) : null;
  }
  if (token) {
    const fromToken = getHospitalIdFromToken(token);
    return fromToken != null ? String(fromToken) : null;
  }
  return sessionStorage.getItem(HOSPITAL_ID_STORAGE_KEY);
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
