import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { assetService, PagedResponse } from '@/services/assetService';
import { useAdminStore } from '@/app/store/adminStore';
import { locationService } from '@/services/locationService';
import { signTypeService } from '@/services/signTypeService';
import { Asset, Location, SignType } from '@/shared/types';
import { AssetStatsCards } from '../components/AssetStatsCards';
import { AssetFilters } from '../components/AssetFilters';
import { AssetTable } from '../components/AssetTable';
import { CreateAssetDialog } from '../components/CreateAssetDialog';
import { ExportQrSvgDialog } from '../components/ExportQrSvgDialog';
import { Pagination } from '@/shared/components/Pagination';
import { getApiError } from '@/shared/helpers/apiError';
import { exportService } from '@/services/exportService';
import { ImportExcelDialog } from '@/shared/components/ImportExcelDialog';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

const PAGE_SIZE = 10;

export default function AssetListPage() {
  const queryClient = useQueryClient();

  // Trang, ô tìm kiếm và bộ lọc đều nằm trên địa chỉ: vào xem chi tiết một biển rồi bấm
  // "Quay lại" thì về đúng trang 3 kèm bộ lọc đang chọn, thay vì trang 1 trống trơn.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '0');
  const search = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'ALL';
  const materialFilter = searchParams.get('material') ?? 'ALL';
  const updateParams = (changes: Record<string, string | number>) => setSearchParams(
    prev => {
      const n = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(changes)) {
        // Giá trị mặc định thì bỏ khỏi địa chỉ cho gọn.
        if (value === 0 || value === '' || value === 'ALL') n.delete(key); else n.set(key, String(value));
      }
      return n;
    },
    { replace: true },
  );
  const setPage = (p: number) => updateParams({ page: p });

  const { selectedHospitalId } = useAdminStore();
  const hospitalIdParam = selectedHospitalId ?? undefined;

  const { data: assetData, isLoading } = useQuery<PagedResponse<Asset>>({
    queryKey: ['assets', page, search, hospitalIdParam],
    queryFn: () => assetService.getAssetsPage(page, PAGE_SIZE, search, hospitalIdParam),
  });
  const assets = assetData?.content ?? [];

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations', hospitalIdParam],
    queryFn: () => locationService.getAllLocations(hospitalIdParam),
  });

  const { data: signTypes = [] } = useQuery<SignType[]>({
    queryKey: ['signTypes', hospitalIdParam],
    queryFn: () => signTypeService.getAllSignTypes(hospitalIdParam),
  });

  const deleteMutation = useMutation({
    mutationFn: assetService.deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      // Xem chú thích ở AssetDetailPage — cây biển báo nạp riêng theo vị trí.
      queryClient.invalidateQueries({ queryKey: ['locationAssets'] });
      toast.success('Đã xóa biển báo');
    },
    // Máy chủ trả về câu đầy đủ (số phiếu trong lịch sử, hướng chuyển sang Thanh lý) nên
    // getApiError luôn ưu tiên dùng nó; câu dưới chỉ là dự phòng khi không đọc được phản hồi.
    onError: (error: unknown) => toast.error(getApiError(error, 'Không thể xóa biển báo này.')),
  });

  const handleDeleteAsset = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa biển báo này khỏi hệ thống?')) {
      deleteMutation.mutate(id);
    }
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try { await exportService.exportAssets(search); }
    finally { setExporting(false); }
  };

  const filteredAssets = assets.filter(asset =>
    (statusFilter === 'ALL' || asset.status === statusFilter) &&
    (materialFilter === 'ALL' || asset.material === materialFilter)
  );

  return (
    <div className="space-y-8">
      <AssetStatsCards
        totalCount={assetData?.totalElements ?? 0}
        activeCount={assets.filter(a => a.status === 'ACTIVE').length}
        damagedCount={assets.filter(a => a.status === 'DAMAGED').length}
        repairingCount={assets.filter(a => a.status === 'REPAIRING').length}
      />

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <AssetFilters
          search={search}
          onSearchChange={(v) => updateParams({ q: v, page: 0 })}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => updateParams({ status: v, page: 0 })}
          materialFilter={materialFilter}
          onMaterialFilterChange={(v) => updateParams({ material: v, page: 0 })}
        >
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
            <FileDown size={15} />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>
          <ExportQrSvgDialog hospitalId={hospitalIdParam} />
          <ImportExcelDialog type="assets" label="biển báo"
            invalidateKeys={[['assets'], ['locations'], ['locationAssets']]} />
          <CreateAssetDialog locations={locations} signTypes={signTypes} />
        </AssetFilters>

        <AssetTable
          assets={filteredAssets}
          isLoading={isLoading}
          page={page}
          pageSize={PAGE_SIZE}
          onDelete={handleDeleteAsset}
        />

        <Pagination
          page={page}
          totalPages={assetData?.totalPages ?? 1}
          totalCount={assetData?.totalElements ?? 0}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="biển báo"
        />
      </div>
    </div>
  );
}
