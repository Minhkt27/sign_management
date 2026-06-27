import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
import { User } from '@/shared/types';

interface Props {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: number, data: { fullName: string; phone?: string }) => void;
  onClearError: () => void;
  isPending: boolean;
  error: string;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

function validatePhone(digits: string): string {
  if (!digits) return '';
  if (!/^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/.test(digits))
    return 'Số điện thoại không hợp lệ (VD: 0901 234 567)';
  return '';
}

export function EditUserDialog({ user, open, onOpenChange, onSubmit, onClearError, isPending, error }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (user && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(user.fullName);
      setPhone(formatPhone(user.phone ?? ''));
      setPhoneError('');
    }
  }, [user, open]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setPhoneError(validatePhone(formatted.replace(/\D/g, '')));
    onClearError();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const rawPhone = phone.replace(/\D/g, '');
    const err = validatePhone(rawPhone);
    if (err) { setPhoneError(err); return; }
    onSubmit(user.id, { fullName, phone: rawPhone || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Pencil size={18} className="text-blue-600" />
            <span>Sửa thông tin tài khoản</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tên đăng nhập</label>
            <Input value={user?.username ?? ''} disabled className="bg-slate-50 text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Họ và tên</label>
            <Input value={fullName} onChange={e => { setFullName(e.target.value); onClearError(); }} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
            <Input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={12}
              className={phoneError ? 'border-red-400 focus:border-red-400' : ''}
            />
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={isPending || !!phoneError}>
              {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
