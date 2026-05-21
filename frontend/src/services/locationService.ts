import { apiClient } from './apiClient';
import { Location, LocationTreeNode } from '../shared/types';

export const locationService = {
  getAllLocations: async (): Promise<Location[]> => {
    const response = await apiClient.get<Location[]>('/locations');
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
