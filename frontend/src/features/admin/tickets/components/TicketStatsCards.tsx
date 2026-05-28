import { Clock, AlertCircle, Wrench, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/shared/components/StatCard';

interface Props {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

export function TicketStatsCards({ total, open, inProgress, resolved }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard label="Tổng phiếu bảo trì" value={total} icon={<Clock size={24} />} iconBg="bg-blue-50 text-blue-600" />
      <StatCard label="Chờ tiếp nhận" value={open} valueColor="text-rose-600" icon={<AlertCircle size={24} />} iconBg="bg-rose-50 text-rose-600" />
      <StatCard label="Đang xử lý" value={inProgress} valueColor="text-amber-600" icon={<Wrench size={24} />} iconBg="bg-amber-50 text-amber-600" />
      <StatCard label="Đã sửa xong" value={resolved} valueColor="text-emerald-600" icon={<CheckCircle2 size={24} />} iconBg="bg-emerald-50 text-emerald-600" />
    </div>
  );
}
