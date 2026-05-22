import { apiClient } from './apiClient';
import { User } from '@/shared/types';

export const userService = {
  getAll: (): Promise<User[]> =>
    apiClient.get<User[]>('/users').then(r => r.data),

  createTechnician: (data: { username: string; fullName: string; password: string }): Promise<User> =>
    apiClient.post<User>('/users', data).then(r => r.data),

  setActive: (id: number, active: boolean): Promise<User> =>
    apiClient.put<User>(`/users/${id}/active`, { active }).then(r => r.data),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    apiClient.put('/users/me/password', { currentPassword, newPassword }).then(() => undefined),
};
