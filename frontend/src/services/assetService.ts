import { apiClient } from './apiClient';
import { Asset } from '../shared/types';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export const assetService = {
  getAllAssets: async (): Promise<Asset[]> => {
    const response = await apiClient.get<Asset[]>('/assets/all');
    return response.data;
  },

  getAssetsPage: async (page = 0, size = 50, search = '', hospitalId?: number): Promise<PagedResponse<Asset>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search) params.set('search', search);
    if (hospitalId) params.set('hospitalId', String(hospitalId));
    const response = await apiClient.get<PagedResponse<Asset>>(`/assets?${params}`);
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

  getAssetsByLocation: async (locationId: number, page = 0, size = 50): Promise<PagedResponse<Asset>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await apiClient.get<PagedResponse<Asset>>(`/assets/location/${locationId}?${params}`);
    return response.data;
  },

  createAsset: async (asset: Omit<Partial<Asset>, 'location'> & { locationId: number }): Promise<Asset> => {
    const payload = {
      ...asset,
      location: { id: asset.locationId },
    };
    const response = await apiClient.post<Asset>('/assets', payload);
    return response.data;
  },

  updateAsset: async (id: string, asset: Omit<Partial<Asset>, 'location'> & { locationId?: number }): Promise<Asset> => {
    const payload = {
      ...asset,
      ...(asset.locationId ? { location: { id: asset.locationId } } : {}),
    };
    const response = await apiClient.put<Asset>(`/assets/${id}`, payload);
    return response.data;
  },

  deleteAsset: async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`);
  },
};
