import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { MapNode } from '@/shared/types';
import { assetService } from '@/services/assetService';
import { mapService } from '@/services/mapService';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (node: MapNode, label: string) => void;
}

export function QRScannerModal({ open, onClose, onScanSuccess }: QRScannerModalProps) {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const startPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    if (!open) {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        const startPromise = startPromiseRef.current;
        scannerRef.current = null;
        
        (async () => {
          if (startPromise) {
            try { await startPromise; } catch (e) {}
          }
          try {
            await scanner.stop();
            scanner.clear();
          } catch (e) {
            console.error('Stop scanner error:', e);
          }
        })();
      }
      return;
    }

    setError('');
    setLoading(false);
    isProcessingRef.current = false;

    const scanner = new Html5Qrcode('qr-reader-in-app');
    scannerRef.current = scanner;

    startPromiseRef.current = scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        try {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          setLoading(true);
          
          let assetCode = decodedText;
          if (decodedText.includes('/scan/')) {
            assetCode = decodedText.split('/scan/')[1].split('?')[0];
          }

          const asset = await assetService.getAssetByCode(assetCode);
          if (!asset) throw new Error('Không tìm thấy mã tài sản');
          
          const node = await mapService.getNodeByAsset(asset.id);
          if (!node) throw new Error('Mã tài sản không được gắn trên bản đồ');
          
          const label = node.label || asset.name || asset.location?.name || 'Vị trí của bạn';
          
          onScanSuccess(node, label);
          onClose();
        } catch (err: any) {
          console.error('QR Scan Error:', err);
          setError(err?.response?.data?.message || err?.message || 'Mã QR không hợp lệ. Vui lòng thử mã khác.');
          setTimeout(() => {
            isProcessingRef.current = false;
            setLoading(false);
          }, 1500);
        }
      },
      () => { /* ignore */ }
    );

    startPromiseRef.current.catch(() => {
      setError('Không thể mở Camera. Vui lòng cấp quyền sử dụng máy ảnh cho trình duyệt.');
    });

    return () => {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        const startPromise = startPromiseRef.current;
        scannerRef.current = null;
        
        (async () => {
          if (startPromise) {
            try { await startPromise; } catch (e) {}
          }
          try {
            await scanner.stop();
            scanner.clear();
          } catch (e) {
            console.error('Stop scanner cleanup error:', e);
          }
        })();
      }
    };
  }, [open, onClose, onScanSuccess]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm ${open ? '' : 'hidden'}`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Camera className="w-5 h-5 text-green-400" />
          Quét QR định vị lại
        </h3>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm aspect-square bg-black/50 rounded-[2rem] overflow-hidden relative border-2 border-white/20 shadow-2xl">
          <div id="qr-reader-in-app" className="w-full h-full object-cover"></div>
          
          {loading && (
            <div className="absolute inset-0 z-10 bg-green-900/90 flex flex-col items-center justify-center backdrop-blur-md">
              <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin border-green-400 mb-4 shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
              <p className="text-green-300 font-bold animate-pulse tracking-wide">Đang xác định vị trí...</p>
            </div>
          )}
        </div>
        
        <p className="text-white/70 text-center mt-8 text-sm max-w-xs leading-relaxed font-medium">
          Đưa mã QR trên tường vào khung vuông để hệ thống tự động tìm vị trí của bạn.
        </p>

        {error && (
          <div className="mt-6 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm font-medium text-center max-w-xs animate-in fade-in slide-in-from-bottom-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
