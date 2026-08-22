import { User } from '@/shared/types';

interface Props {
  statusFilter: string;
  onStatusChange: (v: string) => void;
  priorityFilter: string;
  onPriorityChange: (v: string) => void;
  assigneeFilter: string;
  onAssigneeChange: (v: string) => void;
  technicians: User[];
}

export function TicketFilters({ statusFilter, onStatusChange, priorityFilter, onPriorityChange, assigneeFilter, onAssigneeChange, technicians }: Props) {
  const selectClass = "border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className={selectClass}>
        <option value="ALL">Tất cả Trạng thái</option>
        <option value="OPEN">Chờ tiếp nhận</option>
        <option value="IN_PROGRESS">Đang xử lý</option>
        <option value="RESOLVED">Đã sửa xong</option>
        <option value="CLOSED">Đã đóng phiếu</option>
      </select>

      <select value={priorityFilter} onChange={(e) => onPriorityChange(e.target.value)} className={selectClass}>
        <option value="ALL">Tất cả Độ ưu tiên</option>
        <option value="CRITICAL">Khẩn cấp</option>
        <option value="HIGH">Cao</option>
        <option value="MEDIUM">Trung bình</option>
        <option value="LOW">Thấp</option>
      </select>

      <select value={assigneeFilter} onChange={(e) => onAssigneeChange(e.target.value)} className={selectClass}>
        <option value="ALL">Tất cả KTV</option>
        {technicians.map(t => (
          <option key={t.id} value={t.id}>{t.fullName}</option>
        ))}
      </select>
    </div>
  );
}
