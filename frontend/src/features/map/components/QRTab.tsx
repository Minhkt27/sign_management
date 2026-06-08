import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import { mapService } from '@/services/mapService';
import { assetService } from '@/services/assetService';
import { MapNode, MapFloorData, Location } from '@/shared/types';
import { Search, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  allFloorData: MapFloorData[];
  locations: Location[];
  onSetLocation: (node: MapNode, label: string) => void;
}

function extractAssetCode(raw: string): string | null {
  // Matches /scan/ASSET_CODE, /assets/ASSET_CODE, /tech/assets/ASSET_CODE
  const match = raw.match(/\/(?:scan|tech\/assets|assets)\/([^/?#]+)/);
  if (match) return match[1];
  
  // If it's a plain string and not a full URL, use it as is
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    return raw.trim();
  }
  return null;
}

export function QRTab({ allFloorData, locations, onSetLocation }: Props) {
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: assetService.getAllAssets,
  });

  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        scannerRef.current = null;
        setScanning(false);
      });
    }
  };

  useEffect(() => () => { stopScanner(); }, []);

  const startScanner = async () => {
    setStatus('idle');
    setMessage('');
    processingRef.current = false;
    setScanning(true);
    await new Promise(r => setTimeout(r, 100)); // wait for DOM

    const qr = new Html5Qrcode('qr-viewport');
    scannerRef.current = qr;
    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (text) => {
          if (processingRef.current) return;
          processingRef.current = true;
          await handleScanned(text);
        },
        () => {}
      );
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
      return;
    }

    try {
      const asset = await assetService.getAssetByCode(assetCode);
      const node = await mapService.getNodeByAsset(asset.id);
      setStatus('ok');
      setMessage(`Đã xác định: ${node.label ?? assetCode}`);
      onSetLocation(node, node.label ?? assetCode);
    } catch {
      setStatus('err');
      setMessage('Biển này chưa được gắn vị trí trên sơ đồ.');
    }
  };

  const allNodes = allFloorData.flatMap(fd => fd.nodes.map(n => ({ node: n, floorData: fd })));

  // Default list: ENTRANCE nodes (hiển thị ngay không cần gõ)
  const entranceNodes = allNodes.filter(({ node }) => node.type === 'ENTRANCE' && node.label);

  // Search: node label + location name + linked asset code/name
  const manualResults = manualSearch.trim()
    ? (() => {
        const q = manualSearch.toLowerCase();
        
        // Find matching assets
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
    <div className="space-y-5">
      {/* Camera scanner */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #C8DEC8', boxShadow: '0 2px 16px rgba(26,92,42,.08)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#C8DEC8' }}>
          <p className="text-sm font-extrabold" style={{ color: '#1A2E1E' }}>📷 Quét mã QR trên biển báo</p>
          <p className="text-xs mt-0.5" style={{ color: '#5A7A62' }}>Hướng camera vào mã QR gắn trên biển để xác định vị trí</p>
        </div>

        <div className="p-4 space-y-3">
          {scanning ? (
            <div className="relative">
              <div id="qr-viewport" className="w-full rounded-xl overflow-hidden" style={{ background: '#000' }} />
              <button onClick={stopScanner}
                className="mt-2 w-full py-2 rounded-xl text-sm font-bold"
                style={{ background: '#F3F4F6', color: '#374151' }}>
                Dừng camera
              </button>
            </div>
          ) : (
            <button onClick={startScanner}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[.98]"
              style={{ background: '#1A5C2A', color: '#fff' }}>
              📷 Mở camera quét QR
            </button>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl" style={{ background: '#EAF4EC', color: '#1A5C2A' }}>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
              {message}
            </div>
          )}
          {status === 'ok' && (
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl" style={{ background: '#D1FAE5', color: '#065F46' }}>
              <CheckCircle2 size={16} className="flex-shrink-0" /> {message}
            </div>
          )}
          {status === 'err' && (
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl" style={{ background: '#FEE2E2', color: '#991B1B' }}>
              <XCircle size={16} className="flex-shrink-0" /> {message}
            </div>
          )}
        </div>
      </div>

      {/* Manual selection */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid #C8DEC8', boxShadow: '0 2px 16px rgba(26,92,42,.08)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#C8DEC8' }}>
          <p className="text-sm font-extrabold" style={{ color: '#1A2E1E' }}>📍 Chọn vị trí thủ công</p>
          <p className="text-xs mt-0.5" style={{ color: '#5A7A62' }}>Nếu không có mã QR, tìm và chọn nơi bạn đang đứng</p>
        </div>
        <div className="p-4 space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#5A7A62' }} />
            <input
              value={manualSearch}
              onChange={e => setManualSearch(e.target.value)}
              placeholder="Tìm tên phòng, khu vực..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F2F7F3', border: '1.5px solid #C8DEC8', color: '#1A2E1E' }}
            />
          </div>
          {/* Entrance nodes — hiện mặc định khi chưa gõ */}
          {!manualSearch.trim() && entranceNodes.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#5A7A62' }}>Lối vào phổ biến</p>
              <div className="flex flex-col gap-1">
                {entranceNodes.map(({ node, floorData: fd }) => {
                  const floorLoc = locations.find(l => l.id === fd.floor.locationId);
                  return (
                    <button key={node.id}
                      onClick={() => { onSetLocation(node, node.label!); setStatus('ok'); setMessage(`Đã chọn: ${node.label}`); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:scale-[.98]"
                      style={{ background: '#F2F7F3', border: '1px solid #C8DEC8' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: '#EAF4EC' }}>🚪</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#1A2E1E' }}>{node.label}</p>
                        <p className="text-xs" style={{ color: '#5A7A62' }}>{floorLoc?.name ?? `Tầng #${fd.floor.id}`}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search results */}
          {manualResults.length > 0 && (
            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
              {manualResults.map(({ node, floorData: fd }) => {
                const loc = node.locationId ? locations.find(l => l.id === node.locationId) : null;
                const floorLoc = locations.find(l => l.id === fd.floor.locationId);
                const linkedAsset = node.assetId ? assets.find(a => a.id === node.assetId) : null;
                const displayName = linkedAsset ? linkedAsset.assetCode : (loc?.name ?? node.label ?? node.type);
                return (
                  <button key={node.id}
                    onClick={() => { onSetLocation(node, displayName); setManualSearch(''); setStatus('ok'); setMessage(`Đã chọn: ${displayName}`); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:scale-[.98]"
                    style={{ background: '#F2F7F3', border: '1px solid #C8DEC8' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: '#EAF4EC' }}>
                      {node.type === 'ENTRANCE' ? '🚪' : node.type === 'DEPARTMENT' ? '🏢' : '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#1A2E1E' }}>{displayName}</p>
                      <p className="text-xs" style={{ color: '#5A7A62' }}>{floorLoc?.name ?? `Tầng #${fd.floor.id}`}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {manualSearch.trim() && manualResults.length === 0 && (
            <p className="text-xs text-center py-3" style={{ color: '#5A7A62' }}>Không tìm thấy "{manualSearch}"</p>
          )}
        </div>
      </div>
    </div>
  );
}
