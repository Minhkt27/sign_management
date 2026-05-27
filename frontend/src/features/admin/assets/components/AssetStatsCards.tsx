import { CheckCircle2, AlertCircle, Wrench, ShieldAlert } from 'lucide-react';
import { StatCard } from '@/shared/components/StatCard';

interface Props {
  totalCount: number;
  activeCount: number;
  damagedCount: number;
  repairingCount: number;
}

export function AssetStatsCards({ totalCount, activeCount, damagedCount, repairingCount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard label="Tổng biển báo" value={totalCount} icon={<ShieldAlert size={24} />} iconBg="bg-blue-50 text-blue-600" />
      <StatCard label="Đang hoạt động" value={activeCount} valueColor="text-emerald-600" icon={<CheckCircle2 size={24} />} iconBg="bg-emerald-50 text-emerald-600" />
      <StatCard label="Cần sửa chữa (Hỏng)" value={damagedCount} valueColor="text-rose-600" icon={<AlertCircle size={24} />} iconBg="bg-rose-50 text-rose-600" />
      <StatCard label="Đang sửa" value={repairingCount} valueColor="text-amber-600" icon={<Wrench size={24} />} iconBg="bg-amber-50 text-amber-600" />
    </div>
  );
}
