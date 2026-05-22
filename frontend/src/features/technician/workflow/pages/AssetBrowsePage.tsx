import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Search, X } from 'lucide-react';

export default function AssetBrowsePage() {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const handleCodeFound = (code: string) => {
    // QR encodes full URL like http://host/tech/assets/LED-R101
    // or plain assetCode like LED-R101
    const match = code.match(/\/tech\/assets\/([^/?#]+)/);
    const assetCode = match ? match[1] : code.trim();
    navigate(`/tech/assets/${assetCode}`);
  };

  const startScan = async () => {
    setError('');
    setScanning(true);
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScan();
          handleCodeFound(decodedText);
        },
        undefined
      );
    } catch {
      setError('Không thể truy cập camera. Kiểm tra quyền camera của trình duyệt.');
      setScanning(false);
    }
  };

  const stopScan = () => {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  return (
    <div className="space-y-5 pb-12">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <QrCode className="text-blue-600" size={18} />
          Quét mã QR biển báo
        </h2>

        {/* Camera scanner */}
        {!scanning ? (
          <Button
            onClick={startScan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2"
          >
            <QrCode size={18} />
            Mở camera quét mã
          </Button>
        ) : (
          <div className="space-y-3">
            <div id={containerId} className="rounded-xl overflow-hidden border border-slate-200" />
            <Button
              variant="outline"
              onClick={stopScan}
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
