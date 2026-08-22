import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { roleService } from '../services/roleService';
import { PermissionMatrix } from './PermissionMatrix';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { username: string; fullName: string; password: string; roleId: number; phone?: string; customPermissions: string[] }) => void;
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

export function CreateUserDialog({ open, onOpenChange, onSubmit, isPending, error }: Props) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localError, setLocalError] = useState('');

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getAllRoles,
    enabled: open,
  });

  // Auto-select first role if available
  useEffect(() => {
    if (roles.length > 0 && !roleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoleId(roles[0].id.toString());
    }
  }, [roles, roleId]);

  const reset = () => {
    setUsername(''); setFullName(''); setPhone(''); setPassword(''); setConfirmPassword('');
    setRoleId(roles.length > 0 ? roles[0].id.toString() : '');
    setCustomPermissions([]); setShowAdvanced(false); setLocalError('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!roleId) { setLocalError('Vui lòng chọn một nhóm quyền'); return; }
    if (password !== confirmPassword) { setLocalError('Mật khẩu xác nhận không khớp'); return; }
    if (password.length < 6) { setLocalError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    const rawPhone = phone.replace(/\D/g, '');
    const phoneErr = validatePhone(rawPhone);
    if (phoneErr) { setLocalError(phoneErr); return; }
    onSubmit({ username, fullName, password, roleId: Number(roleId), phone: rawPhone || undefined, customPermissions });
  };

  const displayError = localError || error;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus size={18} className="text-blue-600" />
            <span>Thêm tài khoản mới</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tên đăng nhập</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Họ và tên</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
              <Input type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} maxLength={13} />
            </div>
            <div className="space-y-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Nhóm quyền (Role)</label>
            <Select value={roleId} onValueChange={(v) => setRoleId(v || '')} disabled={isLoadingRoles}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhóm quyền...">
                  {roleId ? roles.find(r => r.id.toString() === roleId)?.name : "Chọn nhóm quyền..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="border rounded-md border-slate-200">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
              <span className="text-sm font-medium text-slate-700">Quyền nâng cao (Ngoại lệ)</span>
              {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500 mb-3">
                Các quyền chọn ở đây sẽ được cấp thêm cho tài khoản này bất kể nhóm quyền đang chọn là gì.
              </p>
              <PermissionMatrix
                selectedPermissions={customPermissions}
                onChange={setCustomPermissions}
              />
            </CollapsibleContent>
          </Collapsible>

          {displayError && <p className="text-sm text-red-500">{displayError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={isPending || isLoadingRoles}>
              {isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
