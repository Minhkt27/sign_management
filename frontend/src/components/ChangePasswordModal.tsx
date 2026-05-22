import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KeyRound } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: Props) {
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
      setTimeout(() => { setSuccess(false); onClose(); }, 1200);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    },
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
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} />
            Đổi mật khẩu
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <p className="text-center text-green-600 font-medium py-4">Đổi mật khẩu thành công!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mật khẩu mới</label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label>
              <Input
                type="password"
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
