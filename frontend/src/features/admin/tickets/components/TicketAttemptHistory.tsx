import { History } from 'lucide-react';
import { TicketAttempt } from '@/shared/types';
import { getBackendUrl } from '@/shared/helpers/imageUrl';

interface Props {
  attempts: TicketAttempt[];
  onZoom: (src: string) => void;
}

const formatTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');

function Thumb({ label, path, onZoom }: { label: string; path?: string | null; onZoom: (src: string) => void }) {
  return (
    <div className="space-y-1 text-center">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <div
        className={`aspect-video bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center ${path ? 'cursor-zoom-in' : ''}`}
        onClick={() => path && onZoom(getBackendUrl(path))}
      >
        {path
          ? <img src={getBackendUrl(path)} alt={label} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-xs text-slate-400">Không có ảnh</span>}
      </div>
    </div>
  );
}

// Các lần sửa bị "Yêu cầu sửa lại" — giữ làm bằng chứng nghiệm thu, mới nhất ở trên.
export function TicketAttemptHistory({ attempts, onZoom }: Props) {
  if (attempts.length === 0) return null;
  const newestFirst = [...attempts].reverse();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
        <History size={14} /> <span>Lịch sử các lần sửa bị từ chối ({attempts.length})</span>
      </h3>
      <div className="space-y-3">
        {newestFirst.map(a => (
          <div key={a.attempt} className="bg-white border border-amber-200/70 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-amber-700">Lần sửa thứ {a.attempt}</span>
              <span className="text-xs text-slate-500">
                {a.technicianName ?? 'Kỹ thuật viên'} gửi lúc {formatTime(a.submittedAt)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Thumb label="Trước khi sửa" path={a.imageBefore} onZoom={onZoom} />
              <Thumb label="Sau khi sửa" path={a.imageAfter} onZoom={onZoom} />
            </div>
            <div className="text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-slate-700">
              <span className="font-semibold text-amber-800">Lý do từ chối:</span> {a.rejectionNote}
              <div className="text-xs text-slate-500 mt-1">
                {a.rejectedBy ?? 'Quản trị viên'} · {formatTime(a.rejectedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
