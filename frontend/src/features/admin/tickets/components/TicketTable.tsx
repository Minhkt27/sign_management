import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, UserCheck } from 'lucide-react';
import { MaintenanceTicket, User } from '@/shared/types';
import { renderPriorityBadge, renderTicketStatusBadge } from '@/shared/helpers/ticketBadges';

interface Props {
  tickets: MaintenanceTicket[];
  isLoading: boolean;
  page: number;
  pageSize: number;
}

function AssigneeName({ assignee }: { assignee: User | null }) {
  if (!assignee) return <span className="text-slate-400 text-sm font-medium italic">Chưa phân công</span>;
  return <span className="text-sm font-semibold text-slate-700">{assignee.fullName}</span>;
}

export function TicketTable({ tickets, isLoading, page, pageSize }: Props) {
  const navigate = useNavigate();

  return (
    <div className="border border-slate-200 rounded-xl overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-12">STT</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Biển hiệu</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left max-w-[200px]">Mô tả sự cố</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-28">Độ ưu tiên</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-32">Trạng thái</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left">Kỹ thuật viên</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-28">Ngày tạo</TableHead>
            <TableHead className="text-sm font-bold text-slate-700 text-left w-20">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-400 font-medium">Đang tải...</TableCell>
            </TableRow>
          ) : tickets.length > 0 ? (
            tickets.map((t, idx) => (
              <TableRow key={t.id} className="hover:bg-slate-50/50">
                <TableCell className="text-sm font-bold text-slate-800 text-left w-12">{page * pageSize + idx + 1}</TableCell>
                <TableCell className="text-sm text-left cursor-pointer" onClick={() => navigate(`/admin/assets/${t.asset?.id}`)}>
                  <span className="font-bold text-blue-600 hover:underline">{t.asset?.name || t.asset?.assetCode || 'N/A'}</span>
                  {t.asset?.name && t.asset?.assetCode && (
                    <span className="block text-xs text-slate-400 font-normal">{t.asset.assetCode}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-600 text-left max-w-[200px]">
                  <span className="line-clamp-2" title={t.description}>{t.description}</span>
                </TableCell>
                <TableCell className="text-sm text-left w-28">{renderPriorityBadge(t.priority)}</TableCell>
                <TableCell className="text-sm text-left w-32">{renderTicketStatusBadge(t.ticketStatus)}</TableCell>
                <TableCell className="text-sm text-left"><AssigneeName assignee={t.assignee} /></TableCell>
                <TableCell className="text-sm text-slate-500 text-left w-28">{new Date(t.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                <TableCell className="text-left w-20">
                  <div className="flex items-center gap-1">
                    <Button onClick={() => navigate(`/admin/tickets/${t.id}`)} variant="ghost" size="sm" className="hover:bg-slate-100 text-slate-600 p-2 rounded-lg">
                      <Eye size={16} />
                    </Button>
                    {t.ticketStatus === 'OPEN' && (
                      <Button onClick={() => navigate(`/admin/tickets/assign/${t.id}`)} variant="ghost" size="sm" className="hover:bg-blue-50 text-blue-600 p-2 rounded-lg" title="Phân công nhân viên">
                        <UserCheck size={16} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-400 font-medium">Không tìm thấy phiếu sửa chữa nào.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
