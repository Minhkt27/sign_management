import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Trash2 } from 'lucide-react';
import { Asset, SignType } from '@/shared/types';
import { renderAssetStatusBadge } from '../helpers/assetBadges';

interface Props {
  assets: Asset[];
  signTypes: SignType[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  onDelete: (id: string) => void;
}

export function AssetTable({ assets, signTypes, isLoading, page, pageSize, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <div className="border border-slate-200 rounded-xl overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-[60px]">STT</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Mã biển</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Tên biển</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Loại biển</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Chất liệu</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Kích thước</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Trạng thái</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-400 font-medium">
                Đang tải...
              </TableCell>
            </TableRow>
          ) : assets.length > 0 ? (
            assets.map((asset, index) => (
              <TableRow key={asset.id} className="hover:bg-slate-50/50">
                <TableCell className="text-sm text-left font-medium text-slate-500">{page * pageSize + index + 1}</TableCell>
                <TableCell className="text-sm font-bold text-blue-700 text-left">{asset.assetCode}</TableCell>
                <TableCell className="text-sm text-slate-700 text-left font-medium max-w-[200px] truncate">{asset.name || '—'}</TableCell>
                <TableCell className="text-sm text-left">
                  {asset.signTypeId ? (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold">
                      {signTypes.find(st => st.id === asset.signTypeId)?.name || '—'}
                    </Badge>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-sm font-medium text-slate-600 text-left">{asset.material}</TableCell>
                <TableCell className="text-sm text-slate-600 text-left">{asset.size}</TableCell>
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
              <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-400 font-medium">
                Không tìm thấy biển báo vật lý nào phù hợp.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
