import { apiClient } from './apiClient';
import { User } from '@/shared/types';
import { PagedResponse } from './assetService';

export const userService = {
  getAll: (): Promise<User[]> =>
    apiClient.get<User[]>('/users').then(r => r.data),

  getPage: (page = 0, size = 15, search = ''): Promise<PagedResponse<User>> =>
    apiClient.get<PagedResponse<User>>(
      `/users?page=${page}&size=${size}&search=${encodeURIComponent(search)}`
    ).then(r => r.data),

  createUser: (data: { username: string; fullName: string; password: string; roleId: number; phone?: string; customPermissions: string[] }): Promise<User> =>
    apiClient.post<User>('/users', data).then(r => r.data),

  updateUser: (id: number, data: { fullName: string; phone?: string }): Promise<User> =>
    apiClient.put<User>(`/users/${id}`, data).then(r => r.data),

  updateRoleAndPermissions: (id: number, data: { roleId: number; customPermissions: string[] }): Promise<User> =>
    apiClient.put<User>(`/users/${id}/role-permissions`, data).then(r => r.data),

  deleteUser: (id: number): Promise<void> =>
    apiClient.delete(`/users/${id}`).then(() => undefined),

  setActive: (id: number, active: boolean): Promise<User> =>
    apiClient.put<User>(`/users/${id}/active`, { active }).then(r => r.data),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    apiClient.put('/users/me/password', { currentPassword, newPassword }).then(() => undefined),

  resetPassword: (id: number): Promise<string> =>
    apiClient.put<{ temporaryPassword: string }>(`/users/${id}/reset-password`)
      .then(r => r.data.temporaryPassword),
};
