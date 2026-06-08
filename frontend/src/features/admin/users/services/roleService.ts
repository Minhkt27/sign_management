import { apiClient } from '@/services/apiClient';
import { Role } from '@/shared/types';

export const roleService = {
  getAllRoles: (): Promise<Role[]> =>
    apiClient.get<Role[]>('/roles').then(r => r.data),

  getRoleById: (id: number): Promise<Role> =>
    apiClient.get<Role>(`/roles/${id}`).then(r => r.data),

  createRole: (data: { code: string; name: string; description?: string; permissions: string[] }): Promise<Role> =>
    apiClient.post<Role>('/roles', data).then(r => r.data),

  updateRole: (id: number, data: { code: string; name: string; description?: string; permissions: string[] }): Promise<Role> =>
    apiClient.put<Role>(`/roles/${id}`, data).then(r => r.data),

  deleteRole: (id: number): Promise<void> =>
    apiClient.delete(`/roles/${id}`).then(() => undefined),
};
