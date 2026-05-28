import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { fileService } from '@/services/fileService';
import { mapService } from '@/services/mapService';
import { MaintenanceTicket } from '@/shared/types';
import { authStore } from '@/app/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Wrench, Camera, ShieldCheck, Image as ImageIcon, Plus, RotateCcw, FolderOpen, Map } from 'lucide-react';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PRIORITY_LABELS } from '@/shared/helpers/ticketBadges';
import { MapNodeModal } from '../components/MapNodeModal';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const cameraBeforeRef = useRef<HTMLInputElement>(null);
  const galleryBeforeRef = useRef<HTMLInputElement>(null);
  const cameraAfterRef = useRef<HTMLInputElement>(null);
  const galleryAfterRef = useRef<HTMLInputElement>(null);

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

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_SIZE_MB = 5;

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Chỉ chấp nhận file ảnh JPG, PNG, GIF, WEBP.';
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
  const currentUser = authStore.getUser();
  const isAssignee = !task.assignee || task.assignee.id === currentUser?.id;

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
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </Badge>
        </div>
        <h2 className="text-lg font-bold text-slate-800 leading-snug">{task.asset?.assetCode}</h2>
        <p className="text-sm text-slate-500">{locationName} — {task.asset?.material} ({task.asset?.size})</p>
        <button
          onClick={() => setShowMapModal(true)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Map size={15} /> Xem trên sơ đồ
        </button>
      </div>

      {showMapModal && task.asset && (
        <MapNodeModal
          assetId={task.asset.id}
          assetCode={task.asset.assetCode}
          onClose={() => setShowMapModal(false)}
        />
      )}

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
          isAssignee ? (
            <div className="space-y-3">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-slate-600">Hình ảnh trước khi sửa (tùy chọn)</p>
                <input ref={cameraBeforeRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} />
                <input ref={galleryBeforeRef} type="file" accept="image/*" hidden onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => cameraBeforeRef.current?.click()} className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200">
                    <Camera size={16} />
                    <span>Chụp ảnh</span>
                  </button>
                  <button type="button" onClick={() => galleryBeforeRef.current?.click()} className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200">
                    <FolderOpen size={16} />
                    <span>Thư viện</span>
                  </button>
                </div>
                {beforeFile && <p className="text-xs text-emerald-600 font-semibold truncate">Đã chọn: {beforeFile.name}</p>}
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
          ) : (
            <div className="bg-slate-50 text-slate-500 p-4 rounded-xl border border-slate-200 text-sm font-medium">
              Phiếu này đã được giao cho <span className="font-bold text-slate-700">{task.assignee?.fullName}</span>. Bạn chỉ có thể xem.
            </div>
          )
        )}

        {task.ticketStatus === 'IN_PROGRESS' && (
          isAssignee ? (
            <div className="space-y-3">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-slate-600">Hình ảnh sau khi sửa <span className="text-red-500">(bắt buộc)</span></p>
                <input ref={cameraAfterRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
                <input ref={galleryAfterRef} type="file" accept="image/*" hidden onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => cameraAfterRef.current?.click()} className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-green-200 bg-green-50 text-sm font-semibold text-green-700 hover:bg-green-100 active:bg-green-200">
                    <Camera size={16} />
                    <span>Chụp ảnh</span>
                  </button>
                  <button type="button" onClick={() => galleryAfterRef.current?.click()} className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200">
                    <FolderOpen size={16} />
                    <span>Thư viện</span>
                  </button>
                </div>
                {afterFile && <p className="text-xs text-emerald-600 font-semibold truncate">Đã chọn: {afterFile.name}</p>}
              </div>
              {uploadError && <p className="text-red-500 text-sm font-semibold">{uploadError}</p>}
              <Button
                onClick={handleCompleteWork}
                disabled={isUploading}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center space-x-2"
              >
                <Camera size={18} />
                <span>{isUploading ? 'Đang tải lên...' : 'Hoàn thành sửa chữa'}</span>
              </Button>
            </div>
          ) : (
            <div className="bg-slate-50 text-slate-500 p-4 rounded-xl border border-slate-200 text-sm font-medium">
              Phiếu này đang được xử lý bởi <span className="font-bold text-slate-700">{task.assignee?.fullName}</span>. Bạn chỉ có thể xem.
            </div>
          )
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
