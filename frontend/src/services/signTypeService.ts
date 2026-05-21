import { apiClient } from './apiClient';
import { SignType } from '../shared/types';

export const signTypeService = {
  getAllSignTypes: async (): Promise<SignType[]> => {
    const response = await apiClient.get<SignType[]>('/sign-types');
    return response.data;
  },

  getSignTypeById: async (id: number): Promise<SignType> => {
    const response = await apiClient.get<SignType>(`/sign-types/${id}`);
    return response.data;
  },

  createSignType: async (signType: Partial<SignType>): Promise<SignType> => {
    const response = await apiClient.post<SignType>('/sign-types', signType);
    return response.data;
  },

  updateSignType: async (id: number, signType: Partial<SignType>): Promise<SignType> => {
    const response = await apiClient.put<SignType>(`/sign-types/${id}`, signType);
    return response.data;
  },

  deleteSignType: async (id: number): Promise<void> => {
    await apiClient.delete(`/sign-types/${id}`);
  },
};
