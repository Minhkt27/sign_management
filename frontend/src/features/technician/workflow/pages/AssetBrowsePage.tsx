import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/services/assetService';
import { ticketService } from '@/services/ticketService';
import { PagedResponse } from '@/services/assetService';
import { Asset, MaintenanceTicket } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, Calendar, Plus, Wrench } from 'lucide-react';

export default function AssetBrowsePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchCode, setSearchCode] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [showReportForm, setShowReportForm] = useState(false);
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  const { data: assets = [], isLoading: isAssetsLoading } = useQuery<Asset[]>({
    queryKey: ['assets', 'all'],
    queryFn: () => assetService.getAllAssets(),
  });

  const { data: ticketData } = useQuery<PagedResponse<MaintenanceTicket>>({
    queryKey: ['tickets'],
    queryFn: () => ticketService.getTickets(),
  });
  const tickets = ticketData?.content ?? [];

  const createTicketMutation = useMutation({
    mutationFn: (newTicket: { assetId: string; description: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) =>
      ticketService.createTicket(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'all'] });
      setShowReportForm(false);
      setIssueDesc('');
      setIssuePriority('MEDIUM');
      if (selectedAsset) {
        queryClient.refetchQueries({ queryKey: ['assets', 'all'] });
      }
    },
  });

  const handleScanSimulation = (code: string) => {
    const a = assets.find((item: Asset) => item.assetCode.toUpperCase() === code.trim().toUpperCase());
    if (a) {
      setSelectedAsset(a);
      setShowReportForm(false);
    } else {
      alert('Không tìm thấy biển báo nào với mã này! Hãy thử: LED-R101 hoặc ALU-R102');
    }
  };

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !issueDesc) return;
    createTicketMutation.mutate({
      assetId: selectedAsset.id,
      description: issueDesc,
      priority: issuePriority,
    });
  };

  const activeTicket = selectedAsset
    ? tickets.find((t: MaintenanceTicket) => t.asset?.id === selectedAsset.id && (t.ticketStatus === 'OPEN' || t.ticketStatus === 'IN_PROGRESS'))
    : null;

  const locationName = selectedAsset?.location?.name || 'Chưa xác định';

  const renderStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5">Hoạt động</Badge>;
      case 'DAMAGED':
        return <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2 py-0.5">Sự cố</Badge>;
      case 'REPAIRING':
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5">Sửa chữa</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5">{status}</Badge>;
    }
  };

  if (isAssetsLoading) {
    return <div className="text-center py-12 text-slate-500 text-base font-medium">Đang tải danh sách thiết bị...</div>;
  }

  return (
    <div className="space-y-5 pb-12 text-left">
      {/* QR Scan simulation */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
          <QrCode className="text-blue-600" size={18} />
          <span>Giả lập quét mã QR Biển báo</span>
        </h2>

        <p className="text-sm text-slate-500 leading-relaxed">
          Nhập mã biển báo (ví dụ: <strong className="text-blue-600">LED-R101</strong> hoặc <strong className="text-blue-600">ALU-R102</strong>) để giả lập quét mã QR từ camera di động.
        </p>

        <div className="flex space-x-2">
          <Input
            placeholder="Nhập mã biển hiệu..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScanSimulation(searchCode)}
            className="border-slate-200 focus:border-blue-500 rounded-lg text-sm"
          />
          <Button
            onClick={() => handleScanSimulation(searchCode)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm px-5 font-semibold"
          >
            Quét mã
          </Button>
        </div>

        {/* Quick select */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 self-center uppercase">Demo nhanh:</span>
          {assets.map((a: Asset) => (
            <button
              key={a.id}
              onClick={() => {
                setSearchCode(a.assetCode);
                handleScanSimulation(a.assetCode);
              }}
              className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg font-semibold border border-slate-200/60 transition-colors"
            >
              {a.assetCode}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Asset Details */}
      {selectedAsset && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">{selectedAsset.assetCode}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{locationName}</p>
            </div>
            <div>{renderStatusBadge(selectedAsset.status)}</div>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chất liệu</span>
              <p className="text-sm font-semibold text-slate-700">{selectedAsset.material}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kích thước</span>
              <p className="text-sm font-semibold text-slate-700">{selectedAsset.size}</p>
            </div>
            <div className="space-y-0.5 col-span-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Calendar size={11} /> <span>Ngày lắp đặt</span>
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {selectedAsset.installedAt ? new Date(selectedAsset.installedAt).toLocaleDateString('vi-VN') : '—'}
              </p>
            </div>
          </div>

          {/* Active ticket or report button */}
          {activeTicket ? (
            <div
              onClick={() => navigate(`/tech/tasks/${activeTicket.id}`)}
              className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between cursor-pointer active:bg-amber-100/50"
            >
              <div className="flex items-center space-x-3 text-amber-800">
                <Wrench size={18} className="text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Đang có yêu cầu sửa chữa</p>
                  <p className="text-xs text-amber-600 mt-0.5">Mã phiếu: #{activeTicket.id} ({activeTicket.ticketStatus})</p>
                </div>
              </div>
              <Badge className="bg-amber-600 text-white text-xs px-2.5 py-1">Xem</Badge>
            </div>
          ) : (
            !showReportForm && (
              <Button
                onClick={() => setShowReportForm(true)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center space-x-2"
              >
                <Plus size={18} />
                <span>Báo hỏng biển báo này</span>
              </Button>
            )
          )}

          {/* Report Form */}
          {showReportForm && (
            <form onSubmit={handleReportIssue} className="border-t border-slate-100 pt-4 space-y-4">
              <h4 className="text-sm font-bold text-rose-600">Báo cáo sự cố biển hiệu</h4>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mô tả hỏng hóc</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mô tả cụ thể: Bảng LED không phát sáng, biển hiệu lỏng ốc vít,..."
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  className="w-full border border-slate-200 bg-white text-slate-700 p-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Độ ưu tiên</label>
                <select
                  value={issuePriority}
                  onChange={(e) => setIssuePriority(e.target.value as any)}
                  className="w-full border border-slate-200 bg-white text-slate-700 p-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="LOW">Thấp (Low)</option>
                  <option value="MEDIUM">Trung bình (Medium)</option>
                  <option value="HIGH">Cao (High)</option>
                  <option value="CRITICAL">Khẩn cấp (Critical)</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReportForm(false)}
                  className="w-1/2 rounded-lg text-sm py-3"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm py-3 font-bold"
                >
                  Gửi báo cáo
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
