import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { assetService } from '@/services/assetService';
import { ticketService } from '@/services/ticketService';
import { authStore } from '@/app/store/authStore';
import { getBackendUrl } from '@/shared/helpers/imageUrl';
import { Asset, MaintenanceTicket } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Ruler, Building, Calendar, AlertCircle, Wrench, ArrowLeft, HandshakeIcon, Map } from 'lucide-react';
import { MapNodeModal } from '../components/MapNodeModal';

export default function ScanLandingPage() {
  const { assetCode } = useParams<{ assetCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [takeError, setTakeError] = useState('');
  const [createError, setCreateError] = useState('');

  const { data: asset, isLoading, isError } = useQuery<Asset>({
    queryKey: ['asset-by-code', assetCode],
    queryFn: () => assetService.getAssetByCode(assetCode!),
    enabled: !!assetCode,
  });

  const currentUser = authStore.getUser();

  const { data: ticketData } = useQuery({
    queryKey: ['tickets', { assetId: asset?.id }],
    queryFn: () => ticketService.getTickets({ assetId: asset!.id }),
    enabled: !!asset?.id,
  });

  const activeTicket = ticketData?.content?.find(
    (t: MaintenanceTicket) => t.ticketStatus === 'OPEN' || t.ticketStatus === 'IN_PROGRESS'
  );

  const takeMutation = useMutation({
    mutationFn: (ticketId: number) => ticketService.takeTicket(ticketId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['techTickets'] });
      navigate(`/tech/tasks/${updated.id}`);
    },
    onError: () => setTakeError('Không thể nhận việc. Phiếu có thể đã được người khác nhận.'),
  });

  const createTicketMutation = useMutation({
    mutationFn: () => ticketService.createTicket({
      assetId: asset!.id,
      description: desc,
      priority,
      source: 'QR_SCAN',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['techTickets'] });
      setShowForm(false);
      setDesc('');
      setCreateError('');
    },
    onError: () => setCreateError('Gửi báo cáo thất bại. Vui lòng thử lại.'),
  });

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DAMAGED: 'bg-rose-50 text-rose-700 border-rose-200',
    REPAIRING: 'bg-amber-50 text-amber-700 border-amber-200',
    SCRAPPED: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const statusLabel: Record<string, string> = {
    ACTIVE: 'Hoạt động', DAMAGED: 'Hỏng', REPAIRING: 'Đang sửa', SCRAPPED: 'Thanh lý',
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Đang tải thông tin biển...</p>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertCircle size={40} className="mx-auto text-rose-400" />
        <p className="text-slate-600 font-semibold">Không tìm thấy biển báo <span className="text-rose-600">{assetCode}</span></p>
        <Button variant="outline" onClick={() => navigate('/tech/dashboard')} className="mt-2">
          <ArrowLeft size={15} className="mr-2" /> Về trang chính
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Asset card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {asset.imageUrl ? (
          <img src={getBackendUrl(asset.imageUrl)} alt={asset.assetCode} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
            <span className="text-sm text-slate-400">Chưa có ảnh</span>
          </div>
        )}
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-800">{asset.assetCode}</span>
            <Badge className={`text-xs px-2 py-0.5 border ${statusColor[asset.status]}`}>
              {statusLabel[asset.status]}
            </Badge>
          </div>
          {asset.name && <p className="text-sm text-slate-600 font-medium">{asset.name}</p>}
          <button
            onClick={() => setShowMapModal(true)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
          >
            <Map size={15} /> Xem vị trí trên sơ đồ
          </button>
        </div>
      </div>

      {showMapModal && (
        <MapNodeModal
          assetId={asset.id}
          assetCode={asset.assetCode}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 text-sm text-slate-700">
        {[
          { icon: MapPin, label: 'Vị trí', value: asset.location?.name },
          { icon: Package, label: 'Chất liệu', value: asset.material },
          { icon: Ruler, label: 'Kích thước', value: asset.size },
          { icon: Building, label: 'Nhà cung cấp', value: asset.supplier },
          { icon: Calendar, label: 'Ngày lắp đặt', value: asset.installedAt ? new Date(asset.installedAt).toLocaleDateString('vi-VN') : undefined },
        ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-medium">{label}</p>
              <p className="font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active ticket */}
      {asset.status === 'SCRAPPED' ? (
        <div className="bg-slate-100 border border-slate-300 p-4 rounded-xl flex items-center gap-3 text-slate-500">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">Biển báo này đã thanh lý, không thể báo hỏng.</p>
        </div>
      ) : activeTicket ? (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
          <div
            onClick={() => navigate(`/tech/tasks/${activeTicket.id}`)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3 text-amber-800">
              <Wrench size={18} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Đang có yêu cầu sửa chữa</p>
                <p className="text-xs text-amber-600 mt-0.5">Phiếu #{activeTicket.id} · {activeTicket.ticketStatus}</p>
              </div>
            </div>
            <Badge className="bg-amber-600 text-white text-xs px-2.5 py-1">Xem</Badge>
          </div>
          {activeTicket.ticketStatus === 'OPEN' && !activeTicket.assignee && currentUser && (
            <>
              <Button
                onClick={() => { setTakeError(''); takeMutation.mutate(activeTicket.id); }}
                disabled={takeMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2"
              >
                <HandshakeIcon size={16} />
                {takeMutation.isPending ? 'Đang nhận...' : 'Nhận việc này'}
              </Button>
              {takeError && (
                <p className="text-xs text-rose-600 font-medium text-center">{takeError}</p>
              )}
            </>
          )}
        </div>
      ) : !showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-4 font-bold text-sm flex items-center justify-center gap-2"
        >
          <AlertCircle size={18} />
          Báo hỏng biển báo này
        </Button>
      ) : null}

      {/* Report form */}
      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); createTicketMutation.mutate(); }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4"
        >
          <h4 className="text-sm font-bold text-rose-600 flex items-center gap-2">
            <AlertCircle size={15} /> Báo cáo sự cố
          </h4>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mô tả hỏng hóc *</label>
            <textarea
              required
              rows={3}
              placeholder="Ví dụ: Bảng LED không phát sáng, biển bị nghiêng..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full border border-slate-200 bg-white text-slate-700 p-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Độ ưu tiên</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full border border-slate-200 bg-white text-slate-700 p-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="CRITICAL">Khẩn cấp</option>
            </select>
          </div>
          {createError && (
            <p className="text-xs text-rose-600 font-medium">{createError}</p>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="w-1/2 rounded-lg">Hủy</Button>
            <Button
              type="submit"
              disabled={createTicketMutation.isPending}
              className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
            >
              {createTicketMutation.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </div>
        </form>
      )}

      {createTicketMutation.isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold p-4 rounded-xl text-center">
          Đã gửi báo cáo thành công
        </div>
      )}
    </div>
  );
}
