import { apiClient } from './apiClient';
import { authStore, AuthUser } from '../app/store/authStore';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
    const { token, refreshToken, user } = response.data;
    authStore.setToken(token);
    authStore.setRefreshToken(refreshToken);
    authStore.setUser(user);
    return response.data;
  },
  logout: () => {
    authStore.logout();
  },
  getCurrentUser: (): AuthUser | null => {
    return authStore.getUser();
  },
};
