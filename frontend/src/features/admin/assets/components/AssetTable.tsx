import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Trash2, Building2 } from 'lucide-react';
import { Asset, Hospital } from '@/shared/types';
import { renderAssetStatusBadge } from '../helpers/assetBadges';
import { useAdminStore } from '@/app/store/adminStore';
import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { authStore, isSuperAdmin } from '@/app/store/authStore';

interface Props {
  assets: Asset[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  onDelete: (id: string) => void;
}

export function AssetTable({ assets, isLoading, page, pageSize, onDelete }: Props) {
  const navigate = useNavigate();
  const { selectedHospitalId } = useAdminStore();
  const token = authStore.getToken();
  const isSuper = isSuperAdmin(token);

  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ['all-hospitals'],
    queryFn: hospitalService.getAllHospitals,
    enabled: isSuper && selectedHospitalId === 'ALL',
  });

  const getHospitalName = (id?: number) => {
    if (!id || !hospitals) return '—';
    const h = hospitals.find(x => x.id === id);
    return h ? h.name : '—';
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-[60px]">STT</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Tên biển</TableHead>
            {isSuper && selectedHospitalId === 'ALL' && <TableHead className="text-sm font-bold text-slate-700 text-left">Bệnh viện</TableHead>}
            <TableHead className="text-sm font-bold text-slate-700 text-left">Vị trí lắp đặt</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Trạng thái</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-400 font-medium">
                Đang tải...
              </TableCell>
            </TableRow>
          ) : assets.length > 0 ? (
            assets.map((asset, index) => (
              <TableRow key={asset.id} className="hover:bg-slate-50/50">
                <TableCell className="text-sm text-left font-medium text-slate-500">{page * pageSize + index + 1}</TableCell>
                <TableCell className="text-sm text-slate-700 text-left font-bold max-w-[200px] truncate">{asset.name || '—'}</TableCell>
                {isSuper && selectedHospitalId === 'ALL' && (
                  <TableCell className="text-sm text-left text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="truncate max-w-[120px]" title={getHospitalName(asset.hospitalId)}>
                        {getHospitalName(asset.hospitalId)}
                      </span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-sm text-slate-600 text-left">{asset.locationDescription || '—'}</TableCell>
                <TableCell className="text-sm text-left">{renderAssetStatusBadge(asset.status)}</TableCell>
                <TableCell className="text-left">
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => navigate(`/admin/assets/${asset.id}`)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-blue-50 text-blue-600 p-2 rounded-lg"
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      onClick={() => onDelete(asset.id)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-50 text-red-600 p-2 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-400 font-medium">
                Không tìm thấy biển báo vật lý nào phù hợp.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
