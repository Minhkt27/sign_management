import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketService, TicketSummary } from '@/services/ticketService';
import { PagedResponse } from '@/services/assetService';
import { MaintenanceTicket, User } from '@/shared/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserCheck, Eye, Clock, AlertCircle, Wrench, CheckCircle2 } from 'lucide-react';
import { renderPriorityBadge, renderTicketStatusBadge } from '@/shared/helpers/ticketBadges';

export default function TicketListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Summary query — always global, unaffected by filters
  const { data: summary } = useQuery<TicketSummary>({
    queryKey: ['tickets-summary'],
    queryFn: ticketService.getTicketsSummary,
    staleTime: 60 * 1000,
  });

  const { data: technicians = [] } = useQuery<User[]>({
    queryKey: ['technicians'],
    queryFn: ticketService.getTechnicians,
    staleTime: 5 * 60 * 1000,
  });

  // Paginated list query — server-side filters
  const { data: ticketData, isLoading } = useQuery<PagedResponse<MaintenanceTicket>>({
    queryKey: ['tickets', page, statusFilter, priorityFilter, assigneeFilter],
    queryFn: () => ticketService.getTickets({
      status: statusFilter,
      priority: priorityFilter,
      assigneeId: assigneeFilter !== 'ALL' ? Number(assigneeFilter) : undefined,
    }, page, PAGE_SIZE),
  });
  const tickets = ticketData?.content ?? [];

  const getAssigneeName = (assignee: User | null) => {
    if (!assignee) return <span className="text-slate-400 text-sm font-medium italic">Chưa phân công</span>;
    return <span className="text-sm font-semibold text-slate-700">{assignee.fullName}</span>;
  };

  // Stats from summary endpoint (global counts, unaffected by filter)
  const totalCount = summary?.total ?? 0;
  const openCount = summary?.OPEN ?? 0;
  const inProgressCount = summary?.IN_PROGRESS ?? 0;
  const resolvedCount = summary?.RESOLVED ?? 0;

  const totalPages = ticketData?.totalPages ?? 1;

  return (
    <div className="space-y-8 text-left">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Tổng phiếu bảo trì</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{totalCount}</h3>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-xl">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Chờ tiếp nhận</p>
            <h3 className="text-3xl font-extrabold text-rose-600 mt-1">{openCount}</h3>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3.5 rounded-xl">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Đang xử lý</p>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{inProgressCount}</h3>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3.5 rounded-xl">
            <Wrench size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Đã sửa xong</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{resolvedCount}</h3>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Danh sách Phiếu Bảo trì</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="OPEN">Chờ tiếp nhận</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã sửa xong</option>
              <option value="CLOSED">Đã đóng phiếu</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}
              className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Độ ưu tiên</option>
              <option value="CRITICAL">Khẩn cấp</option>
              <option value="HIGH">Cao</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="LOW">Thấp</option>
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => { setAssigneeFilter(e.target.value); setPage(0); }}
              className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả KTV</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-sm font-bold text-slate-700 text-left">STT</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Biển hiệu</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Mô tả sự cố</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Độ ưu tiên</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Trạng thái</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Kỹ thuật viên</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Ngày phản ánh</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Hoàn thành</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-sm text-slate-400 font-medium">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : tickets.length > 0 ? (
                tickets.map((t, idx) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-sm font-bold text-slate-800 text-left">
                      {page * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="text-sm text-left cursor-pointer hover:underline" onClick={() => navigate(`/admin/assets/${t.asset?.id}`)}>
                      <span className="font-bold text-blue-600">{t.asset?.name || t.asset?.assetCode || 'N/A'}</span>
                      {t.asset?.name && t.asset?.assetCode && (
                        <span className="block text-xs text-slate-400 font-normal">{t.asset.assetCode}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-800 max-w-xs truncate text-left" title={t.description}>
                      {t.description}
                    </TableCell>
                    <TableCell className="text-sm text-left">{renderPriorityBadge(t.priority)}</TableCell>
                    <TableCell className="text-sm text-left">{renderTicketStatusBadge(t.ticketStatus)}</TableCell>
                    <TableCell className="text-sm text-left">{getAssigneeName(t.assignee)}</TableCell>
                    <TableCell className="text-sm text-slate-700 text-left">
                      {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-sm text-left">
                      {t.completedAt
                        ? <span className="text-emerald-600 font-medium">{new Date(t.completedAt).toLocaleDateString('vi-VN')}</span>
                        : <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => navigate(`/admin/tickets/${t.id}`)}
                          variant="ghost"
                          size="sm"
                          className="hover:bg-slate-100 text-slate-600 p-2 rounded-lg"
                        >
                          <Eye size={16} />
                        </Button>
                        {t.ticketStatus === 'OPEN' && (
                          <Button
                            onClick={() => navigate(`/admin/tickets/assign/${t.id}`)}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-blue-50 text-blue-600 p-2 rounded-lg"
                            title="Phân công nhân viên"
                          >
                            <UserCheck size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-sm text-slate-400 font-medium">
                    Không tìm thấy phiếu sửa chữa nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {(ticketData?.totalElements ?? 0) > 0 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-500">
              {`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, ticketData?.totalElements ?? 0)}`} / <strong>{ticketData?.totalElements ?? 0}</strong> phiếu
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-40"
              >
                ← Trước
              </Button>
              <span className="text-sm font-semibold text-slate-700 px-2">
                Trang {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-40"
              >
                Sau →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
