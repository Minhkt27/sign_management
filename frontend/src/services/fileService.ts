import { apiClient } from './apiClient';
import {
  ASSET_IMAGE_OPTIONS,
  FLOOR_MAP_IMAGE_OPTIONS,
  compressImage,
} from '@/shared/helpers/imageCompression';

export const fileService = {
  /**
   * Nén ảnh trước khi gửi.
   *
   * Đặt ở đây thay vì ở từng màn hình để mọi đường tải ảnh đều đi qua — ảnh biển báo, sơ đồ
   * tầng, và ảnh trước/sau khi sửa chữa. Sơ đồ tầng dùng bộ tham số riêng vì cần nét hơn.
   */
  uploadFile: async (file: File, type: 'ASSET' | 'FLOOR_MAP' = 'ASSET'): Promise<string> => {
    const compressed = await compressImage(
      file,
      type === 'FLOOR_MAP' ? FLOOR_MAP_IMAGE_OPTIONS : ASSET_IMAGE_OPTIONS,
    );

    const formData = new FormData();
    formData.append('file', compressed);
    const response = await apiClient.post<{ url: string }>(`/files/upload?type=${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  },
};
