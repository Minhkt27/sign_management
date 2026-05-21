import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { MaintenanceTicket, User } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserCheck } from 'lucide-react';

export default function TicketAssignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: ticket, isLoading: isTicketLoading } = useQuery<MaintenanceTicket>({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getTicketById(Number(id)),
    enabled: !!id,
  });

  const { data: techs = [], isLoading: isTechsLoading } = useQuery<User[]>({
    queryKey: ['technicians'],
    queryFn: ticketService.getTechnicians,
  });

  // Mutation
  const assignMutation = useMutation({
    mutationFn: ({ ticketId, techId }: { ticketId: number; techId: number }) =>
      ticketService.assignTicket(ticketId, techId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate('/admin/tickets');
    },
  });

  const handleAssign = (techId: number) => {
    if (!ticket) return;
    assignMutation.mutate({ ticketId: ticket.id, techId });
  };

  if (isTicketLoading || isTechsLoading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Đang tải thông tin phiếu phân công...</div>;
  }

  if (!ticket) {
    return (
      <div className="text-center p-12">
        <p className="text-slate-500 font-medium">Không tìm thấy phiếu yêu cầu bảo trì này.</p>
        <Button onClick={() => navigate('/admin/tickets')} className="mt-4 bg-blue-600 text-white rounded-lg">Quay lại danh sách</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto text-left">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/admin/tickets')}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold"
      >
        <ArrowLeft size={18} />
        <span>Quay lại danh sách phiếu</span>
      </button>

      {/* Ticket Details Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-bold">Phiếu #{ticket.id}</span>
            <Badge className={
              ticket.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 hover:bg-red-50 border border-red-200' :
              ticket.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 hover:bg-orange-50 border border-orange-200' :
              'bg-blue-50 text-blue-600 hover:bg-blue-50 border border-blue-200'
            }>
              Độ ưu tiên: {ticket.priority}
            </Badge>
          </div>
          <span className="text-xs text-slate-400">Khởi tạo: {new Date(ticket.createdAt).toLocaleString()}</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Thông tin biển báo</h3>
          <p className="text-sm text-slate-700">
            Mã thiết bị: <span className="font-bold text-blue-600">{ticket.asset?.assetCode}</span> ({ticket.asset?.material} - {ticket.asset?.size})
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Nội dung phản ánh</h3>
          <p className="text-sm text-slate-750 bg-slate-50 p-4 rounded-xl border border-slate-200/40 italic leading-relaxed">
            "{ticket.description}"
          </p>
        </div>
      </div>

      {/* Technicians List Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Chọn Kỹ thuật viên phân công</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {techs.length > 0 ? (
            techs.map((tech) => (
              <div 
                key={tech.id} 
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-blue-400 transition-all duration-200"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {tech.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{tech.fullName}</h4>
                    <p className="text-xs text-slate-450 mt-0.5">@{tech.username}</p>
                    <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider flex items-center space-x-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span> Sẵn sàng nhận việc
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleAssign(tech.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-3 text-xs flex items-center space-x-1 font-semibold"
                >
                  <UserCheck size={14} />
                  <span>Giao việc</span>
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-slate-400 font-medium">Không tìm thấy kỹ thuật viên trực tuyến nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
