import { apiClient } from './apiClient';
import { Location, LocationTreeNode } from '../shared/types';

export const locationService = {
  getAllLocations: async (hospitalId?: number | 'ALL' | any): Promise<Location[]> => {
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
    const response = await apiClient.post<Location>('/locations', location);
    return response.data;
  },

  updateLocation: async (id: number, location: Partial<Location>): Promise<Location> => {
    const response = await apiClient.put<Location>(`/locations/${id}`, location);
    return response.data;
  },

  deleteLocation: async (id: number): Promise<void> => {
    await apiClient.delete(`/locations/${id}`);
  },
};
