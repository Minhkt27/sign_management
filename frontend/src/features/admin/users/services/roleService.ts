import { apiClient } from '@/services/apiClient';
import { Role, UiMode } from '@/shared/types';

export type RolePayload = { code: string; name: string; description?: string; uiMode: UiMode; permissions: string[] };

export const roleService = {
  getAllRoles: (): Promise<Role[]> =>
    apiClient.get<Role[]>('/roles').then(r => r.data),

  getRoleById: (id: number): Promise<Role> =>
    apiClient.get<Role>(`/roles/${id}`).then(r => r.data),

  createRole: (data: RolePayload): Promise<Role> =>
    apiClient.post<Role>('/roles', data).then(r => r.data),

  updateRole: (id: number, data: RolePayload): Promise<Role> =>
    apiClient.put<Role>(`/roles/${id}`, data).then(r => r.data),

  deleteRole: (id: number): Promise<void> =>
    apiClient.delete(`/roles/${id}`).then(() => undefined),
};
