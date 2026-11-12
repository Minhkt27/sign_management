import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authStore } from '@/app/store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no user stored', () => {
    expect(authStore.getUser()).toBeNull();
  });

  it('stores and retrieves user', () => {
    const user = { id: 1, username: 'admin', fullName: 'Admin', roleId: 1, customPermissions: [] };
    authStore.setUser(user);
    expect(authStore.getUser()).toEqual(user);
  });

  it('setUser(null) removes user from storage', () => {
    authStore.setUser({ id: 1, username: 'admin', fullName: 'Admin', roleId: 1, customPermissions: [] });
    authStore.setUser(null);
    expect(authStore.getUser()).toBeNull();
  });

  it('stores and retrieves access token', () => {
    authStore.setToken('jwt-token');
    expect(authStore.getToken()).toBe('jwt-token');
  });

  it('setToken(null) removes token', () => {
    authStore.setToken('jwt-token');
    authStore.setToken(null);
    expect(authStore.getToken()).toBeNull();
  });

  it('stores and retrieves refresh token', () => {
    authStore.setRefreshToken('refresh-token');
    expect(authStore.getRefreshToken()).toBe('refresh-token');
  });

  it('logout clears user, token and refresh token', () => {
    authStore.setUser({ id: 1, username: 'admin', fullName: 'Admin', roleId: 1, customPermissions: [] });
    authStore.setToken('jwt-token');
    authStore.setRefreshToken('refresh-token');

    authStore.logout();

    expect(authStore.getUser()).toBeNull();
    expect(authStore.getToken()).toBeNull();
    expect(authStore.getRefreshToken()).toBeNull();
  });
});

// Nhân viên đang đăng nhập quét QR của viện khác: trang công khai phải dùng viện trong QR.
describe('resolveHospitalId', () => {
  const tokenOfHospital = (hospitalId: number | null) => {
    const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${b64({ alg: 'HS256' })}.${b64(hospitalId == null ? { sub: 'superadmin' } : { sub: 'tech', hospitalId })}.sig`;
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => window.history.pushState({}, '', '/'));

  it('trang công khai: viện trong QR thắng viện của tài khoản đang đăng nhập', async () => {
    const { authStore, resolveHospitalId, HOSPITAL_ID_STORAGE_KEY } = await import('@/app/store/authStore');
    authStore.setToken(tokenOfHospital(1));
    sessionStorage.setItem(HOSPITAL_ID_STORAGE_KEY, '4');
    window.history.pushState({}, '', '/scan/ASSET_X');
    expect(resolveHospitalId()).toBe('4');
    window.history.pushState({}, '', '/map');
    expect(resolveHospitalId()).toBe('4');
  });

  it('trang công khai chưa quét QR: dùng viện của tài khoản; SUPER_ADMIN thì chưa có viện', async () => {
    const { authStore, resolveHospitalId } = await import('@/app/store/authStore');
    window.history.pushState({}, '', '/map');
    authStore.setToken(tokenOfHospital(1));
    expect(resolveHospitalId()).toBe('1');
    authStore.setToken(tokenOfHospital(null));
    expect(resolveHospitalId()).toBeNull();
  });

  it('trang quản trị: luôn theo tài khoản, bỏ qua viện còn sót từ lần quét QR', async () => {
    const { authStore, resolveHospitalId, HOSPITAL_ID_STORAGE_KEY } = await import('@/app/store/authStore');
    authStore.setToken(tokenOfHospital(1));
    sessionStorage.setItem(HOSPITAL_ID_STORAGE_KEY, '4');
    window.history.pushState({}, '', '/admin/assets');
    expect(resolveHospitalId()).toBe('1');
  });
});
