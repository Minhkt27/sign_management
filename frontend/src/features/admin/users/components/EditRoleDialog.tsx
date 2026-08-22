import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Shield } from 'lucide-react';
import { Role, UiMode } from '@/shared/types';
import { PermissionMatrix } from './PermissionMatrix';

interface Props {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { code: string; name: string; description?: string; uiMode: UiMode; permissions: string[] }) => void;
  isPending: boolean;
  error: string;
}

export function EditRoleDialog({ role, open, onOpenChange, onSubmit, isPending, error }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uiMode, setUiMode] = useState<UiMode>('ADMIN');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (open) {
      if (role) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCode(role.code);
         
        setName(role.name);
         
        setDescription(role.description || '');
         
        setUiMode(role.uiMode ?? 'ADMIN');
         
        setPermissions(role.permissions);
      } else {
         
        setCode('');
         
        setName('');
         
        setDescription('');
         
        setUiMode('ADMIN');
         
        setPermissions([]);
      }
       
      setLocalError('');
    }
  }, [role, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!code || !name) { setLocalError('Vui lòng điền đủ mã và tên nhóm quyền'); return; }
    onSubmit({ code: code.toUpperCase(), name, description, uiMode, permissions });
  };

  const displayError = localError || error;
  const isDefaultRole = role?.id === 1 || role?.id === 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield size={18} className="text-blue-600" />
            <span>{role ? 'Cập nhật Nhóm quyền' : 'Thêm Nhóm quyền mới'}</span>
          </DialogTitle>
          <DialogDescription>
            Định nghĩa các quyền hạn mặc định cho những tài khoản thuộc nhóm này.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mã nhóm quyền (Code)</label>
              <Input 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                required 
                placeholder="Ví dụ: MANAGER"
                disabled={isDefaultRole}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tên hiển thị</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                placeholder="Ví dụ: Quản lý chi nhánh"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Mô tả chi tiết</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Nhóm quyền dành cho..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Giao diện hiển thị</label>
            <select
              value={uiMode}
              onChange={e => setUiMode(e.target.value as UiMode)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ADMIN">Admin — Giao diện quản trị</option>
              <option value="TECHNICIAN">Kỹ thuật viên — Giao diện mobile</option>
            </select>
            <p className="text-xs text-slate-500">Quyết định giao diện mà người dùng thuộc nhóm này sẽ thấy sau khi đăng nhập.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Chọn các tính năng cho phép (Permissions)</label>
            <div className="bg-slate-50/50 p-1 rounded-lg">
              <PermissionMatrix
                selectedPermissions={permissions}
                onChange={setPermissions}
              />
            </div>
            {isDefaultRole && (
              <p className="text-xs text-amber-600">
                Lưu ý: Không thể sửa đổi mã (code) của nhóm quyền mặc định hệ thống.
              </p>
            )}
          </div>

          {displayError && <p className="text-sm text-red-500">{displayError}</p>}
          
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu...' : 'Lưu Nhóm quyền'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
