import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { MaintenanceTicket } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, User as UserIcon, CheckCircle2, Wrench, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { getBackendUrl } from '@/shared/helpers/imageUrl';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: ticket, isLoading: isTicketLoading } = useQuery<MaintenanceTicket>({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getTicketById(Number(id)),
    enabled: !!id,
  });

  // Mutations
  const closeMutation = useMutation({
    mutationFn: (ticketId: number) => ticketService.updateTicketStatus(ticketId, 'CLOSED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const handleCloseTicket = () => {
    if (!ticket) return;
    closeMutation.mutate(ticket.id);
  };

  if (isTicketLoading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Đang tải thông tin phiếu sửa chữa...</div>;
  }

  if (!ticket) {
    return (
      <div className="text-center p-12">
        <p className="text-slate-500 font-medium">Không tìm thấy thông tin phiếu sửa chữa này.</p>
        <Button onClick={() => navigate('/admin/tickets')} className="mt-4 bg-blue-600 text-white rounded-lg">Quay lại danh sách</Button>
      </div>
    );
  }

  const reporter = ticket.reporter;
  const assignee = ticket.assignee;


  // Helper: Render status badge
  const renderStatusBadge = (status: MaintenanceTicket['ticketStatus']) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1 w-fit"><AlertCircle size={12} /> <span>Chờ tiếp nhận</span></Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-250 flex items-center space-x-1 w-fit"><Wrench size={12} /> <span>Đang xử lý</span></Badge>;
      case 'RESOLVED':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-250 flex items-center space-x-1 w-fit"><CheckCircle2 size={12} /> <span>Đã sửa xong</span></Badge>;
      case 'CLOSED':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center space-x-1 w-fit"><CheckCircle2 size={12} /> <span>Đã đóng phiếu</span></Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/admin/tickets')}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold"
      >
        <ArrowLeft size={18} />
        <span>Quay lại danh sách phiếu</span>
      </button>

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Ticket Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm md:col-span-2 space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-slate-800">Phiếu bảo trì #{ticket.id}</h2>
                <Badge className="bg-slate-100 text-slate-700 border border-slate-250">
                  {ticket.priority}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                <Clock size={12} /> <span>Phản ánh lúc: {new Date(ticket.createdAt).toLocaleString()}</span>
              </p>
            </div>
            <div>{renderStatusBadge(ticket.ticketStatus)}</div>
          </div>

          {/* Asset Info Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thiết bị cần bảo trì</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{ticket.asset?.assetCode}</p>
                <p className="text-xs text-slate-500">{ticket.asset?.material} - {ticket.asset?.size}</p>
              </div>
              <Button 
                onClick={() => navigate(`/admin/assets/${ticket.asset?.id}`)}
                variant="outline" 
                size="sm" 
                className="text-xs border-slate-200 bg-white"
              >
                Xem chi tiết thiết bị
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả sự cố chi tiết</h3>
            <p className="text-sm text-slate-750 leading-relaxed bg-white border border-slate-200/50 p-4 rounded-xl">
              {ticket.description}
            </p>
          </div>

          {/* Before & After Images */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <ImageIcon size={14} /> <span>Hình ảnh đối chiếu thực địa</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trước khi sửa</span>
                <div className="aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative">
                  {ticket.imageBefore ? (
                    <img src={getBackendUrl(ticket.imageBefore)} alt="Before repair" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Chưa cập nhật ảnh</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sau khi sửa</span>
                <div className="aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative">
                  {ticket.imageAfter ? (
                    <img src={getBackendUrl(ticket.imageAfter)} alt="After repair" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Chưa cập nhật ảnh</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Assignee & Work Flow */}
        <div className="space-y-6">
          {/* People Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Thông tin Phân công</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-xs border-b border-slate-50 pb-2">
                <UserIcon size={16} className="text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Người báo hỏng</p>
                  <p className="font-bold text-slate-700">{reporter?.fullName || 'Quản trị viên'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <UserIcon size={16} className="text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Kỹ thuật viên thực hiện</p>
                  <p className="font-bold text-slate-700">
                    {assignee ? assignee.fullName : <span className="text-slate-400 font-medium">Chưa phân công</span>}
                  </p>
                </div>
              </div>
            </div>

            {ticket.ticketStatus === 'OPEN' && (
              <Button 
                onClick={() => navigate(`/admin/tickets/assign/${ticket.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold text-sm"
              >
                Giao việc ngay
              </Button>
            )}

            {ticket.ticketStatus === 'RESOLVED' && (
              <Button 
                onClick={handleCloseTicket}
                className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-3 font-semibold text-sm"
              >
                Đóng phiếu bảo trì
              </Button>
            )}
          </div>

          {/* Workflow Status Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Tiến trình Phiếu bảo trì</h3>
            
            <div className="space-y-4 relative pl-5 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="flex items-start space-x-3 relative">
                <span className="absolute -left-5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white"></span>
                <div>
                  <p className="text-xs font-bold text-slate-700">Đã khởi tạo phiếu</p>
                  <span className="text-[10px] text-slate-400">Khởi tạo bởi quản trị viên.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 relative">
                <span className={`absolute -left-5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  ticket.ticketStatus !== 'OPEN' ? 'bg-blue-600' : 'bg-slate-300'
                }`}></span>
                <div>
                  <p className={`text-xs font-bold ${ticket.ticketStatus !== 'OPEN' ? 'text-slate-700' : 'text-slate-400'}`}>
                    Đã bàn giao công việc
                  </p>
                  {assignee && (
                    <span className="text-[10px] text-slate-400">Giao cho: {assignee.fullName}</span>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3 relative">
                <span className={`absolute -left-5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  (ticket.ticketStatus === 'RESOLVED' || ticket.ticketStatus === 'CLOSED') ? 'bg-blue-600' : 
                  ticket.ticketStatus === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-slate-300'
                }`}></span>
                <div>
                  <p className={`text-xs font-bold ${
                    ticket.ticketStatus !== 'OPEN' ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    Đang triển khai sửa chữa
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 relative">
                <span className={`absolute -left-5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  ticket.ticketStatus === 'RESOLVED' ? 'bg-emerald-500' : 
                  ticket.ticketStatus === 'CLOSED' ? 'bg-slate-700' : 'bg-slate-300'
                }`}></span>
                <div>
                  <p className={`text-xs font-bold ${
                    (ticket.ticketStatus === 'RESOLVED' || ticket.ticketStatus === 'CLOSED') ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    Đã hoàn thành sửa chữa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
