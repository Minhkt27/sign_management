import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Copy, KeyRound } from 'lucide-react';

interface Props {
  /** Mật khẩu tạm vừa được tạo; null nghĩa là không hiển thị hộp thoại. */
  password: string | null;
  username: string;
  onClose: () => void;
}

/**
 * Hiển thị mật khẩu tạm sau khi quản trị viên đặt lại.
 *
 * <p>Trước đây dùng alert() của trình duyệt: không bôi đen được, không copy được, nên quản
 * trị viên phải nhìn rồi gõ tay lại một chuỗi 16 ký tự ngẫu nhiên. Gõ sai một ký tự là người
 * dùng không đăng nhập được và phải đặt lại từ đầu.
 */
export default function TemporaryPasswordDialog({ password, username, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!password) return;
    try {
      // navigator.clipboard chỉ tồn tại trên HTTPS hoặc localhost. Khi chạy thử qua IP nội
      // bộ (http://192.168.x.x) thì không có — rơi xuống nhánh chọn sẵn văn bản để người
      // dùng bấm Ctrl+C, vẫn hơn là gõ tay.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch {
      // rơi xuống nhánh chọn văn bản bên dưới
    }
    const field = document.getElementById('temp-password-field') as HTMLInputElement | null;
    field?.select();
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={!!password} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} />
            Mật khẩu tạm cho {username}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="flex gap-2">
            <input
              id="temp-password-field"
              readOnly
              value={password ?? ''}
              onFocus={e => e.currentTarget.select()}
              className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-base tracking-wide text-slate-800 select-all"
            />
            <Button type="button" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? 'Đã chép' : 'Sao chép'}
            </Button>
          </div>

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Mật khẩu này chỉ hiện <strong>một lần</strong>. Hãy gửi cho người dùng ngay bây giờ —
            đóng hộp thoại là không xem lại được nữa. Người dùng sẽ phải tự đặt mật khẩu mới ở
            lần đăng nhập kế tiếp.
          </p>

          <div className="flex justify-end">
            <Button type="button" onClick={handleClose}>Đã gửi cho người dùng</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
