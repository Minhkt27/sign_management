import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Search, X, ImagePlus } from 'lucide-react';

export default function AssetBrowsePage() {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerId = 'qr-reader';

  const handleCodeFound = (code: string) => {
    const match = code.match(/\/tech\/assets\/([^/?#]+)/);
    const assetCode = match ? match[1] : code.trim();
    navigate(`/tech/assets/${assetCode}`);
  };

  const stopScanner = (scanner: Html5Qrcode) => {
    try {
      return scanner.stop().catch(() => {});
    } catch {
      return Promise.resolve();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    // Reset input so the same file can be selected again
    e.target.value = '';
    try {
      const scanner = new Html5Qrcode('qr-file-reader');
      const result = await scanner.scanFile(file, false);
      handleCodeFound(result);
    } catch {
      setError('Không đọc được mã QR từ ảnh. Thử ảnh khác hoặc quét trực tiếp.');
    }
  };

  // Start scanner only after div is in DOM (useEffect runs post-render)
  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;
    let scanner: Html5Qrcode;

    try {
      scanner = new Html5Qrcode(containerId);
    } catch {
      setError('Không thể khởi tạo camera.');
      setScanning(false);
      return;
    }
    scannerRef.current = scanner;

    try {
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (cancelled) return;
          stopScanner(scanner).finally(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            handleCodeFound(decodedText);
          });
        },
        undefined
      ).catch(() => {
        if (!cancelled) {
          setError('Không thể truy cập camera. Kiểm tra quyền camera của trình duyệt.');
          setScanning(false);
        }
      });
    } catch {
      if (!cancelled) {
        setError('Không thể truy cập camera. Kiểm tra quyền camera của trình duyệt.');
        setScanning(false);
      }
    }

    return () => {
      cancelled = true;
      stopScanner(scanner).finally(() => {
        scannerRef.current = null;
      });
    };
  }, [scanning]);

  return (
    <div className="space-y-5 pb-12">
      {/* Hidden div required by html5-qrcode for file scanning */}
      <div id="qr-file-reader" className="hidden" />

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <QrCode className="text-blue-600" size={18} />
          Quét mã QR biển báo
        </h2>

        {/* Camera scanner */}
        {!scanning ? (
          <div className="space-y-2">
            <Button
              onClick={() => { setError(''); setScanning(true); }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2"
            >
              <QrCode size={18} />
              Mở camera quét mã
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              onClick={() => { setError(''); fileInputRef.current?.click(); }}
              className="w-full flex items-center justify-center gap-2 text-slate-600 rounded-xl py-4"
            >
              <ImagePlus size={18} />
              Chọn ảnh QR từ thư viện
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div id={containerId} className="rounded-xl overflow-hidden border border-slate-200" />
            <Button
              variant="outline"
              onClick={() => setScanning(false)}
              className="w-full flex items-center justify-center gap-2 text-slate-600"
            >
              <X size={16} /> Hủy quét
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        {/* Manual fallback */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <p className="text-xs text-slate-400 font-medium">Hoặc nhập mã biển thủ công:</p>
          <div className="flex gap-2">
            <Input
              placeholder="Ví dụ: LED-R101"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && manualCode.trim() && navigate(`/tech/assets/${manualCode.trim()}`)}
              className="rounded-lg text-sm"
            />
            <Button
              onClick={() => manualCode.trim() && navigate(`/tech/assets/${manualCode.trim()}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4"
            >
              <Search size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
