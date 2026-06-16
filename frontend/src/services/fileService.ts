import { apiClient } from './apiClient';

export const fileService = {
  uploadFile: async (file: File, type: 'ASSET' | 'FLOOR_MAP' = 'ASSET'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>(`/files/upload?type=${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  },
};
