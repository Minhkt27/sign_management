import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { roleService } from '../services/roleService';
import { PermissionMatrix } from './PermissionMatrix';
import { User } from '@/shared/types';

interface Props {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: number, data: { roleId: number; customPermissions: string[] }) => void;
  isPending: boolean;
  error: string;
}

export function EditUserRoleDialog({ user, open, onOpenChange, onSubmit, isPending, error }: Props) {
  const [roleId, setRoleId] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localError, setLocalError] = useState('');

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getAllRoles,
    enabled: open,
  });

  useEffect(() => {
    if (user && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoleId(user.roleId.toString());

      setCustomPermissions(user.customPermissions || []);

      setShowAdvanced((user.customPermissions || []).length > 0);

      setLocalError('');
    }
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLocalError('');
    if (!roleId) { setLocalError('Vui lòng chọn một nhóm quyền'); return; }
    onSubmit(user.id, { roleId: Number(roleId), customPermissions });
  };

  const displayError = localError || error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShieldAlert size={18} className="text-blue-600" />
            <span>Phân quyền tài khoản</span>
          </DialogTitle>
          <DialogDescription>
            Đang thay đổi quyền cho: <strong className="text-slate-800">{user?.fullName} ({user?.username})</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Nhóm quyền (Role gốc)</label>
            <Select value={roleId} onValueChange={(v) => setRoleId(v || '')} disabled={isLoadingRoles}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhóm quyền..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="border rounded-md border-slate-200 mt-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
              <span className="text-sm font-medium text-slate-700">Quyền nâng cao (Quyền ngoại lệ)</span>
              {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500 mb-3">
                Tick để cấp thêm quyền đặc biệt cho người dùng này ngoài các quyền mặc định của Nhóm.
              </p>
              <PermissionMatrix
                selectedPermissions={customPermissions}
                onChange={setCustomPermissions}
              />
            </CollapsibleContent>
          </Collapsible>

          {displayError && <p className="text-sm text-red-500">{displayError}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={isPending || isLoadingRoles}>
              {isPending ? 'Đang lưu...' : 'Lưu quyền hạn'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
