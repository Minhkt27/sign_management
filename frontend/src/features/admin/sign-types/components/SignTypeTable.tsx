import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Building2 } from 'lucide-react';
import { SignType, Hospital } from '@/shared/types';
import { useAdminStore } from '@/app/store/adminStore';
import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { authStore, isSuperAdmin } from '@/app/store/authStore';

interface Props {
  signTypes: SignType[];
  page: number;
  pageSize: number;
  search: string;
  onEdit: (st: SignType) => void;
  onDelete: (st: SignType) => void;
}

export function SignTypeTable({ signTypes, page, pageSize, search, onEdit, onDelete }: Props) {
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
            <TableHead className="text-sm font-bold text-slate-700 text-left w-[60px]">#</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Tên loại biển</TableHead>
            {isSuper && selectedHospitalId === 'ALL' && <TableHead className="text-sm font-bold text-slate-700 text-left">Bệnh viện</TableHead>}
            <TableHead className="text-sm font-bold text-slate-700 text-left">Mô tả</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-[120px]">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signTypes.length > 0 ? (
            signTypes.map((st, idx) => (
              <TableRow key={st.id} className="hover:bg-slate-50/50">
                <TableCell className="text-sm text-slate-400 text-left">{page * pageSize + idx + 1}</TableCell>
                <TableCell className="text-sm font-semibold text-slate-800 text-left">{st.name}</TableCell>
                {isSuper && selectedHospitalId === 'ALL' && (
                  <TableCell className="text-sm text-left text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="truncate max-w-[120px]" title={getHospitalName(st.hospitalId)}>
                        {getHospitalName(st.hospitalId)}
                      </span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-sm text-slate-500 text-left max-w-[300px] truncate">{st.description || '—'}</TableCell>
                <TableCell className="text-left">
                  <div className="flex items-center space-x-1.5">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(st)} className="hover:bg-amber-50 text-amber-600 p-2 rounded-lg" title="Sửa">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(st)} className="hover:bg-red-50 text-red-600 p-2 rounded-lg" title="Xóa">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={selectedHospitalId === 'ALL' ? 5 : 4} className="h-24 text-center text-sm text-slate-400 font-medium">
                {search ? 'Không tìm thấy loại biển phù hợp.' : 'Chưa có loại biển nào. Hãy tạo loại biển đầu tiên!'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
