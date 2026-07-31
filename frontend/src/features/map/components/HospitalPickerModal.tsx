import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { Hospital } from '@/shared/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onSelect: (hospital: Hospital) => void;
}

// Fallback khi mở app "lạnh" (chưa quét QR nào) và GPS không xác định được viện —
// bắt buộc chọn tay để đảm bảo luôn có 1 viện được gán trước khi dùng wayfinding.
export function HospitalPickerModal({ open, onSelect }: Props) {
  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals-public'],
    queryFn: hospitalService.getAllHospitals,
    enabled: open,
  });

  const activeHospitals = hospitals.filter(h => h.active);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[430px] w-[95%] p-4 rounded-2xl [&>button]:hidden"
        style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
      >
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            🏥 Bạn đang ở bệnh viện nào?
          </DialogTitle>
        </DialogHeader>

        <div className="pt-3">
          <p className="text-xs text-slate-500 mb-3">
            Không xác định được vị trí tự động. Hãy chọn bệnh viện để tiếp tục.
          </p>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {activeHospitals.map(hospital => (
              <button
                key={hospital.id}
                onClick={() => onSelect(hospital)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left bg-slate-50 hover:bg-green-50 border border-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-green-100">
                  🏥
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-slate-800">{hospital.name}</p>
                  {hospital.address && (
                    <p className="text-[11px] text-slate-500 truncate">{hospital.address}</p>
                  )}
                </div>
              </button>
            ))}
            {activeHospitals.length === 0 && (
              <p className="text-xs text-center py-4 text-slate-400">Chưa có bệnh viện nào.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
