import { apiClient } from './apiClient';
import { targetHospitalParams } from './targetHospital';

/** Xoá một vị trí sẽ kéo theo những gì. blockers rỗng = xoá được. */
export interface LocationDeleteImpact {
  id: number;
  name: string;
  descendantCount: number;
  descendantsByType: Record<string, number>;
  blockers: string[];
}
import { Location, LocationTreeNode } from '../shared/types';

export const locationService = {
  getAllLocations: async (hospitalId?: number | string | null): Promise<Location[]> => {
    const params = new URLSearchParams();
    if (typeof hospitalId === 'number' || (typeof hospitalId === 'string' && hospitalId !== 'ALL' && !hospitalId.includes('[object'))) {
      params.set('hospitalId', String(hospitalId));
    }
    const response = await apiClient.get<Location[]>(`/locations?${params}`);
    return response.data;
  },

  getLocationTree: async (): Promise<LocationTreeNode[]> => {
    const response = await apiClient.get<LocationTreeNode[]>('/locations/tree');
    return response.data;
  },

  getLocationById: async (id: number): Promise<Location> => {
    const response = await apiClient.get<Location>(`/locations/${id}`);
    return response.data;
  },

  createLocation: async (location: Partial<Location>): Promise<Location> => {
    const response = await apiClient.post<Location>('/locations', location, { params: targetHospitalParams() });
    return response.data;
  },

  updateLocation: async (id: number, location: Partial<Location>): Promise<Location> => {
    const response = await apiClient.put<Location>(`/locations/${id}`, location);
    return response.data;
  },

  /** withChildren: xoá cả vị trí con (server từ chối nếu trong cây còn biển báo / sơ đồ tầng). */
  deleteLocation: async ({ id, withChildren = false }: { id: number; withChildren?: boolean }): Promise<void> => {
    await apiClient.delete(`/locations/${id}`, { params: withChildren ? { withChildren: true } : {} });
  },

  getDeleteImpact: async (id: number): Promise<LocationDeleteImpact> => {
    const response = await apiClient.get<LocationDeleteImpact>(`/locations/${id}/delete-impact`);
    return response.data;
  },
};
