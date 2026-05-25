import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { fileService } from '@/services/fileService';
import { MaintenanceTicket } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Wrench, Camera, ShieldCheck, Image as ImageIcon, Plus, RotateCcw } from 'lucide-react';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { data: task, isLoading: isTaskLoading } = useQuery<MaintenanceTicket>({
    queryKey: ['task', id],
    queryFn: () => ticketService.getTicketById(Number(id)),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, imageBefore, imageAfter }: { status: MaintenanceTicket['ticketStatus']; imageBefore?: string; imageAfter?: string }) =>
      ticketService.updateTicketStatus(Number(id), status, imageBefore, imageAfter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['techTickets'] });
    },
    onError: () => {
      setUploadError('Cập nhật thất bại. Vui lòng thử lại hoặc đăng nhập lại.');
    },
  });

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const MAX_SIZE_MB = 10;

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return 'Chỉ chấp nhận file ảnh (JPG, PNG, WEBP, HEIC).';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Ảnh không được vượt quá ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleStartWork = async () => {
    if (!task) return;
    if (beforeFile) {
      const err = validateImage(beforeFile);
      if (err) { setUploadError(err); return; }
    }
    setIsUploading(true);
    setUploadError('');
    try {
      let imageBeforePath = undefined;
      if (beforeFile) {
        imageBeforePath = await fileService.uploadFile(beforeFile);
      }
      updateStatusMutation.mutate({ status: 'IN_PROGRESS', imageBefore: imageBeforePath });
    } catch {
      setUploadError('Lỗi tải lên hình ảnh trước khi sửa!');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!task) return;
    if (!afterFile) {
      setUploadError('Vui lòng chọn hình ảnh sau khi sửa để đối chiếu!');
      return;
    }
    const err = validateImage(afterFile);
    if (err) { setUploadError(err); return; }
    setIsUploading(true);
    setUploadError('');
    try {
      const imageAfterPath = await fileService.uploadFile(afterFile);
      updateStatusMutation.mutate({ status: 'RESOLVED', imageAfter: imageAfterPath });
    } catch {
      setUploadError('Lỗi tải lên hình ảnh sau khi sửa!');
    } finally {
      setIsUploading(false);
    }
  };

  if (isTaskLoading) {
    return <div className="text-center py-12 text-slate-500 text-base font-medium">Đang tải thông tin công việc...</div>;
  }

  if (!task) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-500 font-medium">Không tìm thấy thông tin công việc được giao.</p>
        <Button onClick={() => navigate('/tech/dashboard')} className="mt-4 bg-blue-600 text-white rounded-lg">Về trang chủ</Button>
      </div>
    );
  }

  const locationName = task.asset?.location?.name || 'Vị trí lắp đặt';

  return (
    <div className="space-y-5 pb-12 text-left">
      {/* Back */}
      <button
        onClick={() => navigate('/tech/dashboard')}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold text-sm"
      >
        <ArrowLeft size={18} />
        <span>Quay lại danh sách nhiệm vụ</span>
      </button>

      {/* Rejection banner */}
      {task.ticketStatus === 'IN_PROGRESS' && task.rejectionNote && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <RotateCcw size={18} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-700">
              Admin yêu cầu sửa lại
              {task.rejectionCount != null && (
                <span className="ml-2 text-xs font-normal text-orange-500">
                  (lần {task.rejectionCount}/3)
                </span>
              )}
            </p>
            <p className="text-sm text-orange-600 mt-0.5">{task.rejectionNote}</p>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-slate-400">Phiếu bảo trì #{task.id}</span>
          <Badge className={
            task.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600 border border-rose-200 text-xs px-2 py-0.5' :
            task.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border border-orange-200 text-xs px-2 py-0.5' :
            'bg-blue-50 text-blue-600 border border-blue-200 text-xs px-2 py-0.5'
          }>
            {task.priority === 'CRITICAL' ? 'Khẩn cấp' :
             task.priority === 'HIGH' ? 'Cao' :
             task.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
          </Badge>
        </div>
        <h2 className="text-lg font-bold text-slate-800 leading-snug">{task.asset?.assetCode}</h2>
        <p className="text-sm text-slate-500">{locationName} — {task.asset?.material} ({task.asset?.size})</p>
      </div>

      {/* Issue description */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả sự cố cần sửa</h3>
        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic font-medium">
          "{task.description}"
        </p>
      </div>

      {/* Field Photos */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <ImageIcon size={14} />
          <span>Hình ảnh thực tế</span>
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 text-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trước sửa</span>
            <div className="aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
              {task.imageBefore ? (
                <img
                  src={getBackendUrl(task.imageBefore)}
                  alt="Before repair"
                  onClick={() => setZoomedImage(getBackendUrl(task.imageBefore))}
                  className="w-full h-full object-cover cursor-zoom-in hover:opacity-85 transition-opacity"
                />
              ) : (
                <span className="text-xs text-slate-400 font-medium">Không có ảnh</span>
              )}
            </div>
          </div>
          <div className="space-y-1.5 text-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sau sửa</span>
            <div className="aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
              {task.imageAfter ? (
                <img
                  src={getBackendUrl(task.imageAfter)}
                  alt="After repair"
                  onClick={() => setZoomedImage(getBackendUrl(task.imageAfter))}
                  className="w-full h-full object-cover cursor-zoom-in hover:opacity-85 transition-opacity"
                />
              ) : (
                <span className="text-xs text-slate-400 font-medium">Chưa cập nhật</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {task.ticketStatus === 'OPEN' && (
          <div className="space-y-3">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Hình ảnh trước khi sửa (tùy chọn)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBeforeFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
            {uploadError && <p className="text-red-500 text-sm font-semibold">{uploadError}</p>}
            <Button
              onClick={handleStartWork}
              disabled={isUploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center space-x-2"
            >
              <Wrench size={18} />
              <span>{isUploading ? 'Đang xử lý...' : 'Tiếp nhận và Bắt đầu sửa'}</span>
            </Button>
          </div>
        )}

        {task.ticketStatus === 'IN_PROGRESS' && (
          <div className="space-y-3">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Hình ảnh sau khi sửa (bắt buộc)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAfterFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
              />
            </div>
            {uploadError && <p className="text-red-500 text-sm font-semibold">{uploadError}</p>}
            <Button
              onClick={handleCompleteWork}
              disabled={isUploading}
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center space-x-2"
            >
              <Camera size={18} />
              <span>{isUploading ? 'Đang tải lên...' : 'Chụp ảnh và Hoàn thành sửa'}</span>
            </Button>
          </div>
        )}

        {task.ticketStatus === 'RESOLVED' && (
          <div className="bg-emerald-50 text-emerald-800 p-5 rounded-xl border border-emerald-200 flex items-center space-x-3">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
            <div>
              <p className="font-bold text-sm">Công việc sửa chữa đã hoàn thành!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Đang chờ quản trị viên kiểm tra và xác nhận đóng phiếu.</p>
            </div>
          </div>
        )}

        {task.ticketStatus === 'CLOSED' && (
          <div className="bg-slate-100 text-slate-800 p-5 rounded-xl border border-slate-200 flex items-center space-x-3">
            <ShieldCheck className="text-slate-600 shrink-0" size={22} />
            <div>
              <p className="font-bold text-sm">Phiếu sửa chữa đã được đóng.</p>
              <p className="text-xs text-slate-500 mt-0.5">Báo cáo đã được lưu vào hồ sơ kiểm toán bệnh viện.</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {zoomedImage && (
        <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none flex items-center justify-center">
            <div className="relative max-h-[85vh] max-w-full overflow-hidden rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 p-2 shadow-2xl">
              <img
                src={zoomedImage}
                alt="Zoomed Task Photo"
                className="max-h-[80vh] max-w-full rounded-xl object-contain"
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 border border-white/20 hover:scale-105 transition-all focus:outline-none"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
