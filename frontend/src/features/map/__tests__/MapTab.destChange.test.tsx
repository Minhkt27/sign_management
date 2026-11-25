import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { MapTab } from '@/features/map/components/MapTab';
import { mapService } from '@/services/mapService';
import { MapFloorData } from '@/shared/types';

// jsdom không có ResizeObserver (khung bản đồ dùng để đo kích thước).
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;

vi.mock('@/services/mapService', () => ({
  mapService: {
    findPathWithSegments: vi.fn(),
    getCampusMap: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
  },
}));

const node = (id: number, type = 'ROOM', label: string | null = null) =>
  ({ id, floorId: 1, x: id / 10, y: 0.5, type, label, locationId: null, assetId: null }) as never;

const floorData: MapFloorData[] = [{
  floor: { id: 1, locationId: null, imageUrl: '/f.png', imgWidth: 100, imgHeight: 100, campus: false },
  nodes: [node(1, 'ENTRANCE'), node(2, 'ROOM', 'Phòng 105'), node(3), node(4)],
  edges: [],
} as never];

const route = (...ids: number[]) => ({
  segments: [{ type: 'INDOOR', nodes: ids.map(id => node(id)) }],
});

const renderTab = (destNodeId: number | null, client: QueryClient) => (
  <QueryClientProvider client={client}>
    <MapTab
      fromNodeId={1}
      fromLabel="Cổng"
      destNodeId={destNodeId}
      floors={[floorData[0].floor]}
      locations={[]}
      allFloorData={floorData}
      onGoToQR={() => {}}
      onSetLocation={() => {}}
    />
  </QueryClientProvider>
);

describe('MapTab — đổi điểm đến từ danh sách Khoa/Phòng', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tìm đường lại tới điểm đến mới, không giữ đường cũ', async () => {
    const find = vi.mocked(mapService.findPathWithSegments);
    find.mockResolvedValueOnce(route(1, 2) as never).mockResolvedValueOnce(route(1, 3) as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { rerender } = render(renderTab(2, client));
    await waitFor(() => expect(find).toHaveBeenCalledWith(1, 2, false));

    rerender(renderTab(3, client));
    await waitFor(() => expect(find).toHaveBeenLastCalledWith(1, 3, false));
    expect(find).toHaveBeenCalledTimes(2);
  });

  it('chọn lại đúng điểm đến cũ thì không tìm thêm lần nữa', async () => {
    const find = vi.mocked(mapService.findPathWithSegments);
    find.mockResolvedValue(route(1, 2) as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { rerender } = render(renderTab(2, client));
    await waitFor(() => expect(find).toHaveBeenCalledTimes(1));
    rerender(renderTab(2, client));
    await new Promise(r => setTimeout(r, 50));
    expect(find).toHaveBeenCalledTimes(1);
  });
});
