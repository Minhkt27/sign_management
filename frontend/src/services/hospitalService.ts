import { apiClient } from './apiClient';
import { Hospital } from '../shared/types';
import { PagedResponse } from './assetService';

export const hospitalService = {
  getAllHospitals: async (): Promise<Hospital[]> => {
    const response = await apiClient.get<Hospital[]>('/hospitals');
    return response.data;
  },

  getNearbyHospital: async (lat: number, lng: number): Promise<Hospital | null> => {
    const response = await apiClient.get<Hospital>('/hospitals/nearby', {
      params: { lat, lng }
    });
    return response.data || null;
  },

  getPage: async (page = 0, size = 15, search = ''): Promise<PagedResponse<Hospital>> => {
    const response = await apiClient.get<PagedResponse<Hospital>>(
      `/hospitals/page?page=${page}&size=${size}&search=${encodeURIComponent(search)}`
    );
    return response.data;
  },

  getHospitalById: async (id: number): Promise<Hospital> => {
    const response = await apiClient.get<Hospital>(`/hospitals/${id}`);
    return response.data;
  },

  createHospital: async (hospital: Omit<Partial<Hospital>, 'shortCode'> & { shortCode?: string | null }): Promise<Hospital> => {
    const response = await apiClient.post<Hospital>('/hospitals', hospital);
    return response.data;
  },

  updateHospital: async (id: number, hospital: Partial<Hospital>): Promise<Hospital> => {
    const response = await apiClient.put<Hospital>(`/hospitals/${id}`, hospital);
    return response.data;
  },

  deleteHospital: async (id: number): Promise<void> => {
    await apiClient.delete(`/hospitals/${id}`);
  },
};
