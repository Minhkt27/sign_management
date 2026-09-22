import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KeyRound } from 'lucide-react';
import { getApiError } from '@/shared/helpers/apiError';
import { authStore } from '@/app/store/authStore';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Chế độ bắt buộc: tài khoản đang dùng mật khẩu tạm do quản trị viên cấp. Hộp thoại không
   * đóng được cho tới khi đổi xong — nếu đóng được thì người dùng sẽ bỏ qua, và mật khẩu mà
   * người khác cũng biết sẽ ở lại vĩnh viễn.
   */
  required?: boolean;
}

export default function ChangePasswordModal({ open, onClose, required = false }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => userService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      // Cờ đã tắt phía máy chủ; cập nhật luôn bản lưu cục bộ để hộp thoại bắt buộc không
      // bật lại ngay sau khi đóng.
      const user = authStore.getUser();
      if (user?.mustChangePassword) {
        authStore.setUser({ ...user, mustChangePassword: false });
      }
      setTimeout(() => { setSuccess(false); onClose(); }, 1200);
    },
    onError: (err: unknown) => setError(getApiError(err, 'Đổi mật khẩu thất bại')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    mutation.mutate();
  };

  const handleClose = () => {
    if (required) return; // chưa đổi xong thì không cho thoát
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* Không chặn Esc/bấm ra ngoài bằng prop ở đây: DialogContent dựng trên Base UI, không
          phải Radix, nên onEscapeKeyDown/onInteractOutside không tồn tại. Base UI gọi
          onOpenChange cho MỌI cách đóng, và handleClose bỏ qua khi required. */}
      <DialogContent className="sm:max-w-md" showCloseButton={!required}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} />
            {required ? 'Đặt mật khẩu mới' : 'Đổi mật khẩu'}
          </DialogTitle>
        </DialogHeader>

        {required && !success && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Tài khoản đang dùng mật khẩu do quản trị viên cấp. Hãy đặt mật khẩu riêng của bạn
            trước khi tiếp tục sử dụng hệ thống.
          </p>
        )}

        {success ? (
          <p className="text-center text-green-600 font-medium py-4">Đổi mật khẩu thành công!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
              <PasswordInput
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mật khẩu mới</label>
              <PasswordInput
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label>
              <PasswordInput
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
