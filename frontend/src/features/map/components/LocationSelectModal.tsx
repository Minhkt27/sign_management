import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import { mapService } from '@/services/mapService';
import { assetService } from '@/services/assetService';
import { MapNode, MapFloorData, Location } from '@/shared/types';
import { Search, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  allFloorData: MapFloorData[];
  locations: Location[];
  onSetLocation: (node: MapNode, label: string) => void;
}

function extractAssetCode(raw: string): string | null {
  const match = raw.match(/\/(?:scan|tech\/assets|assets)\/([^/?#]+)/);
  if (match) return match[1];
  
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    return raw.trim();
  }
  return null;
}

export function LocationSelectModal({ open, onClose, allFloorData, locations, onSetLocation }: Props) {
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: assetService.getAllAssets,
    enabled: open,
  });

  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const startPromiseRef = useRef<Promise<unknown> | null>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      const startPromise = startPromiseRef.current;
      scannerRef.current = null;
      setScanning(false);
      
      if (startPromise) {
        try { await startPromise; } catch { /* ignore */ }
      }
      try {
        await scanner.stop();
        scanner.clear();
      } catch (e) {
        console.error('Stop scanner error:', e);
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    setManualSearch('');
    setStatus('idle');
    setMessage('');
    onClose();
  };

  useEffect(() => {
    if (!open) {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = async () => {
    setStatus('idle');
    setMessage('');
    processingRef.current = false;
    setScanning(true);
    await new Promise(r => setTimeout(r, 100)); // wait for DOM

    const qr = new Html5Qrcode('qr-viewport-modal');
    scannerRef.current = qr;
    try {
      startPromiseRef.current = qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (text) => {
          if (processingRef.current) return;
          processingRef.current = true;
          await handleScanned(text);
        },
        () => {}
      );
      await startPromiseRef.current;
    } catch {
      setScanning(false);
      setStatus('err');
      setMessage('Không thể truy cập camera. Hãy cấp quyền hoặc chọn tay bên dưới.');
    }
  };

  const handleScanned = async (raw: string) => {
    setStatus('loading');
    setMessage('Đang xác định vị trí...');
    stopScanner();

    const assetCode = extractAssetCode(raw);
    if (!assetCode) {
      setStatus('err');
      setMessage('QR không hợp lệ. Hãy quét mã trên biển báo của bệnh viện.');
      processingRef.current = false;
      return;
    }

    try {
      const asset = await assetService.getAssetByCode(assetCode);
      const node = await mapService.getNodeByAsset(asset.id);
      setStatus('ok');
      setMessage(`Đã xác định: ${node.label ?? assetCode}`);
      onSetLocation(node, node.label ?? assetCode);
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch {
      setStatus('err');
      setMessage('Biển này chưa được gắn vị trí trên sơ đồ.');
      processingRef.current = false;
    }
  };

  const allNodes = allFloorData.flatMap(fd => fd.nodes.map(n => ({ node: n, floorData: fd })));
  const entranceNodes = allNodes.filter(({ node }) => node.type === 'ENTRANCE' && node.label);

  const manualResults = manualSearch.trim()
    ? (() => {
        const q = manualSearch.toLowerCase();
        const matchingAssetIds = new Set(
          assets
            .filter(a => a.assetCode.toLowerCase().includes(q) || (a.name && a.name.toLowerCase().includes(q)))
            .map(a => a.id)
        );

        const byNodeLabel = allNodes.filter(({ node }) =>
          node.label && node.label.toLowerCase().includes(q)
        );
        const byLocation = allNodes.filter(({ node }) => {
          if (!node.locationId) return false;
          const loc = locations.find(l => l.id === node.locationId);
          return loc && loc.name.toLowerCase().includes(q);
        });
        const byLinkedAsset = allNodes.filter(({ node }) =>
          node.assetId && matchingAssetIds.has(node.assetId)
        );

        const seen = new Set<number>();
        return [...byNodeLabel, ...byLocation, ...byLinkedAsset]
          .filter(({ node }) => { if (seen.has(node.id)) return false; seen.add(node.id); return true; })
          .slice(0, 15);
      })()
    : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[430px] w-[95%] p-4 overflow-y-auto max-h-[85vh] rounded-2xl" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            📍 Xác định vị trí xuất phát
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Camera scanner */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-700">📷 Quét mã QR trên biển báo</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Hướng camera vào mã QR để nhận diện</p>
            </div>

            <div className="p-3 space-y-2.5">
              {scanning ? (
                <div className="relative">
                  <div id="qr-viewport-modal" className="w-full rounded-lg overflow-hidden bg-black aspect-video" />
                  <button onClick={stopScanner}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                    Dừng camera
                  </button>
                </div>
              ) : (
                <button onClick={startScanner}
                  className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-green-800 text-white hover:bg-green-700 transition-colors shadow-sm">
                  📷 Mở camera quét QR
                </button>
              )}

              {status === 'loading' && (
                <div className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg bg-green-50 text-green-800">
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  {message}
                </div>
              )}
              {status === 'ok' && (
                <div className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg bg-emerald-50 text-emerald-800">
                  <CheckCircle2 size={14} className="flex-shrink-0" /> {message}
                </div>
              )}
              {status === 'err' && (
                <div className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg bg-red-50 text-red-800">
                  <XCircle size={14} className="flex-shrink-0" /> {message}
                </div>
              )}
            </div>
          </div>

          {/* Manual selection */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-700">🔍 Tìm kiếm vị trí thủ công</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Tìm hoặc chọn nơi bạn đang đứng</p>
            </div>
            <div className="p-3 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  placeholder="Tìm phòng, khu vực, mã biển..."
                  className="w-full pl-8 pr-4 py-2 rounded-lg text-xs outline-none border border-slate-200 bg-slate-50 focus:border-green-400 focus:bg-white transition-all text-slate-800 font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Entrance nodes — default */}
              {!manualSearch.trim() && entranceNodes.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Lối vào phổ biến</p>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {entranceNodes.map(({ node, floorData: fd }) => {
                      const floorLoc = locations.find(l => l.id === fd.floor.locationId);
                      return (
                        <button key={node.id}
                          onClick={() => {
                            onSetLocation(node, node.label!);
                            setStatus('ok');
                            setMessage(`Đã chọn: ${node.label}`);
                            setTimeout(() => handleClose(), 600);
                          }}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left bg-slate-50 hover:bg-green-50 border border-slate-100 transition-colors">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0 bg-green-50">🚪</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate text-slate-800">{node.label}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{floorLoc?.name ?? `Tầng #${fd.floor.id}`}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search results */}
              {manualResults.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {manualResults.map(({ node, floorData: fd }) => {
                    const loc = node.locationId ? locations.find(l => l.id === node.locationId) : null;
                    const floorLoc = locations.find(l => l.id === fd.floor.locationId);
                    const linkedAsset = node.assetId ? assets.find(a => a.id === node.assetId) : null;
                    const name = linkedAsset ? linkedAsset.assetCode : (loc?.name ?? node.label ?? node.type);
                    return (
                      <button key={node.id}
                        onClick={() => {
                          onSetLocation(node, name);
                          setStatus('ok');
                          setMessage(`Đã chọn: ${name}`);
                          setTimeout(() => handleClose(), 600);
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left bg-slate-50 hover:bg-green-50 border border-slate-100 transition-colors">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0 bg-green-50">
                          {node.type === 'ENTRANCE' ? '🚪' : node.type === 'DEPARTMENT' ? '🏢' : '📍'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-slate-800">{name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{floorLoc?.name ?? `Tầng #${fd.floor.id}`}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {manualSearch.trim() && manualResults.length === 0 && (
                <p className="text-[11px] text-center py-2 text-slate-400">Không tìm thấy "{manualSearch}"</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
