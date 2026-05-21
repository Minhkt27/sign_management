import { vi } from 'vitest';
import { assetService } from '@/services/assetService';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('assetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAllAssets fetches from /assets/all', async () => {
    const mockAssets = [{ id: '1', assetCode: 'ASSET-001' }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAssets });

    const result = await assetService.getAllAssets();

    expect(apiClient.get).toHaveBeenCalledWith('/assets/all');
    expect(result).toEqual(mockAssets);
  });

  it('getAssetsPage builds correct query string', async () => {
    const mockPage = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 50 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPage });

    const result = await assetService.getAssetsPage(0, 50);

    expect(apiClient.get).toHaveBeenCalledWith('/assets?page=0&size=50');
    expect(result).toEqual(mockPage);
  });

  it('getAssetsPage uses provided page and size', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [], totalElements: 0, totalPages: 0, page: 2, size: 10 } });

    await assetService.getAssetsPage(2, 10);

    expect(apiClient.get).toHaveBeenCalledWith('/assets?page=2&size=10');
  });

  it('createAsset wraps locationId as nested location object', async () => {
    const mockAsset = { id: '1', assetCode: 'ASSET-NEW' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockAsset });

    await assetService.createAsset({ assetCode: 'ASSET-NEW', locationId: 5 });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/assets',
      expect.objectContaining({ location: { id: 5 } }),
    );
  });

  it('deleteAsset calls DELETE /assets/:id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await assetService.deleteAsset('uuid-123');

    expect(apiClient.delete).toHaveBeenCalledWith('/assets/uuid-123');
  });

  it('getAssetById fetches from /assets/:id', async () => {
    const mockAsset = { id: 'uuid-1', assetCode: 'ASSET-001' };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAsset });

    const result = await assetService.getAssetById('uuid-1');

    expect(apiClient.get).toHaveBeenCalledWith('/assets/uuid-1');
    expect(result).toEqual(mockAsset);
  });
});
