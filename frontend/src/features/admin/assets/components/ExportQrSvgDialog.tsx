import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QrCode, Download, Loader2, RefreshCw, LayoutGrid, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { assetService } from '@/services/assetService';
import { locationService } from '@/services/locationService';
import { generateQrGridSvg, downloadSvgFile, groupAssetsByFloor } from '../helpers/exportQrSvg';

interface Props {
  hospitalId?: number;
}

export function ExportQrSvgDialog({ hospitalId }: Props) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [baseUrl, setBaseUrl] = useState(() => {
    return localStorage.getItem('qrBaseUrl') || window.location.origin;
  });

  const [groupByFloor, setGroupByFloor] = useState(true);
  const [columns, setColumns] = useState(4);
  const [includeAssetCode, setIncludeAssetCode] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(true);

  // Lazy query: only fetch full list when user opens the modal
  const { data: allAssets = [], isLoading: isAssetsLoading, isError: isAssetsError } = useQuery({
    queryKey: ['export-qr-assets', hospitalId],
    queryFn: () => assetService.getAllAssets(hospitalId),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: locations = [], isLoading: isLocationsLoading } = useQuery({
    queryKey: ['export-qr-locations', hospitalId],
    queryFn: () => locationService.getAllLocations(hospitalId),
    enabled: open,
    staleTime: 30_000,
  });

  const isLoading = isAssetsLoading || isLocationsLoading;

  const effectiveHospitalId = hospitalId != null ? Number(hospitalId) : null;

  // Lọc theo hospitalId phía client để đảm bảo tuyệt đối khi tài khoản SUPER_ADMIN xuất
  const scopedAssets = useMemo(() => {
    if (effectiveHospitalId == null) return allAssets;
    return allAssets.filter((a) => a.hospitalId == null || a.hospitalId === effectiveHospitalId);
  }, [allAssets, effectiveHospitalId]);

  const floorGroups = useMemo(() => {
    if (!groupByFloor || scopedAssets.length === 0) return [];
    return groupAssetsByFloor(scopedAssets, locations);
  }, [groupByFloor, scopedAssets, locations]);

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value);
    localStorage.setItem('qrBaseUrl', value);
  };

  const handleResetBaseUrl = () => {
    const origin = window.location.origin;
    setBaseUrl(origin);
    localStorage.setItem('qrBaseUrl', origin);
  };

  const handleExportSvg = async () => {
    if (!scopedAssets || scopedAssets.length === 0) {
      toast.error('Không có biển báo nào để xuất cho bệnh viện này.');
      return;
    }

    setIsExporting(true);
    try {
      // Yield to let UI update loading state
      await new Promise((resolve) => setTimeout(resolve, 50));

      const svgString = generateQrGridSvg({
        assets: scopedAssets,
        locations,
        baseUrl: baseUrl || window.location.origin,
        groupByFloor,
        columns,
        includeAssetCode,
        includeLocation,
        cardWidth: 220,
        cardHeight: 280,
        qrSize: 160,
        padding: 24,
        gap: 20,
      });

      const today = new Date().toISOString().slice(0, 10);
      const filename = `danh-sach-qr-bien-bao-${today}.svg`;

      downloadSvgFile(svgString, filename);
      toast.success(`Đã xuất thành công ${scopedAssets.length} mã QR ra file SVG!`);
      setOpen(false);
    } catch (err) {
      console.error('Lỗi khi xuất SVG:', err);
      toast.error('Đã xảy ra lỗi khi tạo file SVG.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
          >
            <QrCode size={15} />
            <span>Xuất QR (SVG)</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <QrCode size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Xuất QR toàn bộ biển báo (SVG)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tạo 1 file SVG vector chứa toàn bộ QR kèm tên biển báo để in ấn hoặc cắt decal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-left">
          {/* Status banner */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Số lượng biển sẽ xuất:</span>
            {isLoading ? (
              <span className="flex items-center gap-1 text-slate-400">
                <Loader2 size={13} className="animate-spin" /> Đang nạp danh sách...
              </span>
            ) : isAssetsError ? (
              <span className="text-rose-600 font-medium">Không thể nạp danh sách</span>
            ) : (
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {scopedAssets.length} biển báo
              </span>
            )}
          </div>

          {/* Group by Floor Toggle */}
          <div className="space-y-2 p-3 bg-slate-50/60 rounded-xl border border-slate-200/80">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={groupByFloor}
                onChange={(e) => setGroupByFloor(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                Nhóm mã QR theo từng tầng
              </span>
            </label>

            {groupByFloor && (
              <div className="text-[11px] text-slate-500 pl-6 space-y-1.5">
                <p className="leading-tight">
                  Từng tầng sẽ có tiêu đề riêng kèm số lượng, thuận tiện cho việc in ấn và dán theo khu vực.
                </p>
                {floorGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                    {floorGroups.map((g) => (
                      <span
                        key={g.floorName}
                        className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-700 shadow-2xs"
                      >
                        <span className="font-medium">{g.floorName}</span>
                        <span className="text-indigo-600 font-bold">({g.assets.length})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Base URL Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Base URL của mã QR
              </label>
              <button
                type="button"
                onClick={handleResetBaseUrl}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <RefreshCw size={11} /> Mặc định
              </button>
            </div>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="https://bv-dakhoa.vn"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <p className="text-[11px] text-slate-400 leading-tight">
              Địa chỉ website trỏ tới khi người dùng quét QR: <br />
              <code className="text-slate-500 font-mono">
                {baseUrl || window.location.origin}/scan/[Mã_Biển]
              </code>
            </p>
          </div>

          {/* Grid Layout Configuration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <LayoutGrid size={14} className="text-slate-500" />
              <span>Số cột hiển thị trên 1 hàng</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 4, 5, 6].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setColumns(col)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    columns === col
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {col} cột
                </button>
              ))}
            </div>
          </div>

          {/* Extra options */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-700">Tùy chọn hiển thị thẻ tem</label>
            <div className="space-y-2 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAssetCode}
                  onChange={(e) => setIncludeAssetCode(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>
                  Hiển thị Mã biển báo (<code className="text-slate-500 font-mono">assetCode</code>)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => setIncludeLocation(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Hiển thị Vị trí / Khu vực cụ thể</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Đóng
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExportSvg}
            disabled={isLoading || isExporting || scopedAssets.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang xử lý SVG...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Tải file SVG</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
