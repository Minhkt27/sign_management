import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { PagedResponse } from '@/services/assetService';
import { MaintenanceTicket, User } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Wrench, CheckCircle2, UserCheck, Eye, Clock, ShieldCheck, QrCode } from 'lucide-react';

export default function TicketListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  // Query
  const { data: ticketData, isLoading } = useQuery<PagedResponse<MaintenanceTicket>>({
    queryKey: ['tickets'],
    queryFn: () => ticketService.getTickets(undefined, 0, 200),
  });
  const tickets = ticketData?.content ?? [];

  const getAssigneeName = (assignee: User | null) => {
    if (!assignee) return <span className="text-slate-400 text-sm font-medium italic">Chưa phân công</span>;
    return <span className="text-sm font-semibold text-slate-700">{assignee.fullName}</span>;
  };

  // Helper: Render priority badge
  const renderPriorityBadge = (priority: MaintenanceTicket['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 text-xs px-2 py-0.5">Khẩn cấp</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-50 border border-orange-200 text-xs px-2 py-0.5">Cao</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 text-xs px-2 py-0.5">Trung bình</Badge>;
      case 'LOW':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs px-2 py-0.5">Thấp</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  // Helper: Render status badge
  const renderStatusBadge = (status: MaintenanceTicket['ticketStatus']) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><AlertCircle size={11} /> <span>Chờ tiếp nhận</span></Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><Wrench size={11} /> <span>Đang xử lý</span></Badge>;
      case 'RESOLVED':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><CheckCircle2 size={11} /> <span>Đã sửa xong</span></Badge>;
      case 'CLOSED':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><ShieldCheck size={11} /> <span>Đã đóng phiếu</span></Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Ticket stats
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.ticketStatus === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.ticketStatus === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.ticketStatus === 'RESOLVED').length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.ticketStatus === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const totalPages = Math.ceil(filteredTickets.length / PAGE_SIZE);
  const pagedTickets = filteredTickets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Đang tải danh sách phiếu bảo trì...</div>;
  }


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
            <p className="text-sm text-slate-500 mt-1">Quản lý và điều phối khắc phục sự cố hỏng hóc biển báo.</p>
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
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Mã phiếu</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Biển hiệu</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Mô tả sự cố</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Độ ưu tiên</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Trạng thái</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Kỹ thuật viên</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Ngày phản ánh</TableHead>
                <TableHead className="text-sm font-bold text-slate-700 text-left">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length > 0 ? (
                pagedTickets.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-sm font-bold text-slate-800 text-left">
                      <div className="flex items-center gap-1.5">
                        <span>#{t.id}</span>
                        {t.source === 'QR_SCAN' && (
                          <Badge className="bg-violet-50 text-violet-700 border border-violet-200 text-[10px] px-1.5 py-0 flex items-center gap-1 font-bold">
                            <QrCode size={9} />QR
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-bold text-blue-600 text-left cursor-pointer hover:underline" onClick={() => navigate(`/admin/assets/${t.asset?.id}`)}>
                      {t.asset?.assetCode || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-xs truncate text-left" title={t.description}>
                      {t.description}
                    </TableCell>
                    <TableCell className="text-sm text-left">{renderPriorityBadge(t.priority)}</TableCell>
                    <TableCell className="text-sm text-left">{renderStatusBadge(t.ticketStatus)}</TableCell>
                    <TableCell className="text-sm text-left">{getAssigneeName(t.assignee)}</TableCell>
                    <TableCell className="text-sm text-slate-500 text-left">
                      {new Date(t.createdAt).toLocaleDateString('vi-VN')}
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
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-400 font-medium">
                    Không tìm thấy phiếu sửa chữa nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-500">
              {`${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredTickets.length)}`} / <strong>{filteredTickets.length}</strong> phiếu
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
                Trang {page + 1} / {totalPages || 1}
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
