import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService, PagedResponse } from '@/services/assetService';
import { locationService } from '@/services/locationService';
import { signTypeService } from '@/services/signTypeService';
import { Asset, Location, SignType } from '@/shared/types';
import { AssetStatsCards } from '../components/AssetStatsCards';
import { AssetFilters } from '../components/AssetFilters';
import { AssetTable } from '../components/AssetTable';
import { CreateAssetDialog } from '../components/CreateAssetDialog';
import { Pagination } from '@/shared/components/Pagination';

const PAGE_SIZE = 10;

export default function AssetListPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [page, setPage] = useState(0);

  const { data: assetData, isLoading } = useQuery<PagedResponse<Asset>>({
    queryKey: ['assets', page, search],
    queryFn: () => assetService.getAssetsPage(page, PAGE_SIZE, search),
  });
  const assets = assetData?.content ?? [];

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: locationService.getAllLocations,
  });

  const { data: signTypes = [] } = useQuery<SignType[]>({
    queryKey: ['signTypes'],
    queryFn: signTypeService.getAllSignTypes,
  });

  const deleteMutation = useMutation({
    mutationFn: assetService.deleteAsset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
    onError: (error: any) => {
      const msg = error?.response?.data?.message
        ?? error?.response?.data
        ?? 'Không thể xóa biển báo này vì đang có phiếu bảo trì liên kết.';
      alert(msg);
    },
  });

  const handleDeleteAsset = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa biển báo này khỏi hệ thống?')) {
      deleteMutation.mutate(id);
    }
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
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => { setStatusFilter(v); setPage(0); }}
          materialFilter={materialFilter}
          onMaterialFilterChange={(v) => { setMaterialFilter(v); setPage(0); }}
        >
          <CreateAssetDialog locations={locations} signTypes={signTypes} />
        </AssetFilters>

        <AssetTable
          assets={filteredAssets}
          signTypes={signTypes}
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
