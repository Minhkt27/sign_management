import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wrench, CheckCircle2, ShieldCheck } from 'lucide-react';
import { MaintenanceTicket } from '@/shared/types';

export const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Khẩn cấp',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Chờ tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã sửa xong',
  CLOSED: 'Đã đóng phiếu',
};

export function renderPriorityBadge(priority: MaintenanceTicket['priority']) {
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
}

export function renderTicketStatusBadge(status: MaintenanceTicket['ticketStatus']) {
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
}
