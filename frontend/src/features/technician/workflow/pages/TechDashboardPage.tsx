import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { authStore } from '@/app/store/authStore';
import { MaintenanceTicket } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function TechDashboardPage() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const [tab, setTab] = useState<'PENDING' | 'DONE'>('PENDING');

  // Query to get tickets for the current tech user
  const { data: tasks = [], isLoading } = useQuery<MaintenanceTicket[]>({
    queryKey: ['techTickets', user?.id],
    queryFn: () => ticketService.getTickets({ assigneeId: user?.id }),
    enabled: !!user?.id,
  });

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter((t: MaintenanceTicket) => {
    if (tab === 'PENDING') {
      return t.ticketStatus === 'IN_PROGRESS' || t.ticketStatus === 'OPEN';
    } else {
      return t.ticketStatus === 'RESOLVED' || t.ticketStatus === 'CLOSED';
    }
  });

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 font-medium">Đang tải danh sách nhiệm vụ...</div>;
  }


  return (
    <div className="space-y-5 pb-8 text-left">
      {/* Top Banner greeting */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Xin chào, {user?.fullName}!</h2>
          <p className="text-[11px] text-slate-450 mt-0.5">Chúc bạn một ngày làm việc hiệu quả.</p>
        </div>
        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
          <ClipboardList size={20} />
        </div>
      </div>

      {/* Tabs segment */}
      <div className="bg-slate-200/60 p-1 rounded-xl grid grid-cols-2 text-center text-xs font-semibold">
        <button
          onClick={() => setTab('PENDING')}
          className={`py-2 rounded-lg transition-all ${
            tab === 'PENDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          Cần xử lý ({tasks.filter((t: MaintenanceTicket) => t.ticketStatus === 'IN_PROGRESS' || t.ticketStatus === 'OPEN').length})
        </button>
        <button
          onClick={() => setTab('DONE')}
          className={`py-2 rounded-lg transition-all ${
            tab === 'DONE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          Đã hoàn thành ({tasks.filter((t: MaintenanceTicket) => t.ticketStatus === 'RESOLVED' || t.ticketStatus === 'CLOSED').length})
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <div
              key={task.id}
              onClick={() => navigate(`/tech/tasks/${task.id}`)}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3 active:scale-[0.98] active:bg-slate-50 transition-all duration-150 cursor-pointer"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold text-slate-400">#{task.id}</span>
                  <Badge className={
                    task.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600 hover:bg-rose-50 border border-rose-200 text-[10px] px-1.5 py-0' :
                    task.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 hover:bg-orange-50 border border-orange-200 text-[10px] px-1.5 py-0' :
                    'bg-blue-50 text-blue-600 hover:bg-blue-50 border border-blue-200 text-[10px] px-1.5 py-0'
                  }>
                    {task.priority}
                  </Badge>
                </div>

                <div className="text-[10px] text-slate-455 flex items-center space-x-1">
                  <Clock size={10} />
                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-slate-550">
                  <span className="font-bold text-blue-600 text-xs">{task.asset?.assetCode}</span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">{task.asset?.location?.name}</span>
                </div>
                <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                <div className="flex items-center space-x-1">
                  {task.ticketStatus === 'IN_PROGRESS' ? (
                    <span className="text-amber-600 font-bold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1"></span>
                      <span>Đang sửa chữa</span>
                    </span>
                  ) : task.ticketStatus === 'RESOLVED' ? (
                    <span className="text-green-600 font-bold flex items-center space-x-1">
                      <CheckCircle2 size={12} className="inline mr-1" />
                      <span>Sửa hoàn thành</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 font-bold">Chờ tiếp nhận</span>
                  )}
                </div>

                <div className="text-blue-600 flex items-center space-x-1 font-bold">
                  <span>Chi tiết</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/50 p-12 text-center text-slate-400 space-y-2">
            <AlertTriangle size={36} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold">Không có nhiệm vụ nào trong danh sách này.</p>
          </div>
        )}
      </div>
    </div>
  );
}
