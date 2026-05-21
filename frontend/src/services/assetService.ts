import { apiClient } from './apiClient';
import { Asset } from '../shared/types';

export const assetService = {
  getAllAssets: async (): Promise<Asset[]> => {
    const response = await apiClient.get<Asset[]>('/assets');
    return response.data;
  },

  getAssetById: async (id: string): Promise<Asset> => {
    const response = await apiClient.get<Asset>(`/assets/${id}`);
    return response.data;
  },

  getAssetByCode: async (code: string): Promise<Asset> => {
    const response = await apiClient.get<Asset>(`/assets/code/${code}`);
    return response.data;
  },

  getAssetsByLocation: async (locationId: number): Promise<Asset[]> => {
    const response = await apiClient.get<Asset[]>(`/assets/location/${locationId}`);
    return response.data;
  },

  createAsset: async (asset: Omit<Partial<Asset>, 'location'> & { locationId: number }): Promise<Asset> => {
    // Transform locationId into nested location object for backend mapping
    const payload = {
      ...asset,
      location: { id: asset.locationId }
    };
    const response = await apiClient.post<Asset>('/assets', payload);
    return response.data;
  },

  updateAsset: async (id: string, asset: Omit<Partial<Asset>, 'location'> & { locationId?: number }): Promise<Asset> => {
    const payload = {
      ...asset,
      ...(asset.locationId ? { location: { id: asset.locationId } } : {})
    };
    const response = await apiClient.put<Asset>(`/assets/${id}`, payload);
    return response.data;
  },

  deleteAsset: async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`);
  },
};
