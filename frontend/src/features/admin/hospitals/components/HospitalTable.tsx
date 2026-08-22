import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';
import { Hospital } from '@/shared/types';

interface Props {
  hospitals: Hospital[];
  page: number;
  pageSize: number;
  search: string;
  onEdit: (hospital: Hospital) => void;
  onDelete: (hospital: Hospital) => void;
}

export function HospitalTable({ hospitals, page, pageSize, search, onEdit, onDelete }: Props) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-[60px]">#</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Mã viện</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Tên bệnh viện</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Địa chỉ</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Số điện thoại</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Trạng thái</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-[120px]">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hospitals.length > 0 ? (
            hospitals.map((h, idx) => (
              <TableRow key={h.id} className="hover:bg-slate-50/50">
                <TableCell className="text-sm text-slate-400 text-left">{page * pageSize + idx + 1}</TableCell>
                <TableCell className="font-mono font-semibold text-slate-700 text-left">{h.shortCode}</TableCell>
                <TableCell className="text-sm font-semibold text-slate-800 text-left">{h.name}</TableCell>
                <TableCell className="text-sm text-slate-500 text-left max-w-[260px] truncate">{h.address || '—'}</TableCell>
                <TableCell className="text-sm text-slate-500 text-left">{h.phone || '—'}</TableCell>
                <TableCell className="text-left">
                  <Badge
                    variant={h.active ? 'default' : 'destructive'}
                    className={`text-sm px-2.5 h-6 ${h.active ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                  >
                    {h.active ? 'Hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div className="flex items-center space-x-1.5">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(h)} className="hover:bg-amber-50 text-amber-600 p-2 rounded-lg" title="Sửa">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(h)} className="hover:bg-red-50 text-red-600 p-2 rounded-lg" title="Xóa">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-400 font-medium">
                {search ? 'Không tìm thấy bệnh viện phù hợp.' : 'Chưa có bệnh viện nào. Hãy tạo bệnh viện đầu tiên!'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
