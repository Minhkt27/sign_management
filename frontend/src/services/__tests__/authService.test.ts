import { vi } from 'vitest';
import { authService } from '@/services/authService';
import { apiClient } from '@/services/apiClient';
import { authStore } from '@/app/store/authStore';

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('login posts to /auth/login with credentials', async () => {
    const mockData = {
      token: 'jwt-token',
      refreshToken: 'refresh-token',
      user: { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN' as const },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockData });

    await authService.login('admin', 'password');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: 'password',
    });
  });

  it('login stores token, refresh token and user on success', async () => {
    const mockData = {
      token: 'jwt-token',
      refreshToken: 'refresh-token',
      user: { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN' as const },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockData });

    const result = await authService.login('admin', 'password');

    expect(authStore.getToken()).toBe('jwt-token');
    expect(authStore.getRefreshToken()).toBe('refresh-token');
    expect(authStore.getUser()).toEqual(mockData.user);
    expect(result).toEqual(mockData);
  });

  it('login throws when API returns error', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Unauthorized'));

    await expect(authService.login('bad', 'creds')).rejects.toThrow('Unauthorized');
  });

  it('logout clears stored auth data', async () => {
    authStore.setToken('jwt-token');
    authStore.setRefreshToken('refresh-token');
    authStore.setUser({ id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN' });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

    await authService.logout();

    expect(authStore.getToken()).toBeNull();
    expect(authStore.getUser()).toBeNull();
  });

  it('getCurrentUser returns user from store', () => {
    const user = { id: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN' as const };
    authStore.setUser(user);

    expect(authService.getCurrentUser()).toEqual(user);
  });
});
