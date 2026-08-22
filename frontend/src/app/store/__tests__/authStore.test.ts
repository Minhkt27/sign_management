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
