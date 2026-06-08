import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '../services/roleService';
import { Role } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Trash2, Edit } from 'lucide-react';
import { getApiError } from '@/shared/helpers/apiError';
import { EditRoleDialog } from '../components/EditRoleDialog';

export default function RoleListPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getAllRoles,
  });

  const createMutation = useMutation({
    mutationFn: roleService.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsDialogOpen(false);
      setDialogError('');
    },
    onError: (err: unknown) => setDialogError(getApiError(err, 'Tạo nhóm quyền thất bại')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof roleService.updateRole>[1] }) =>
      roleService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsDialogOpen(false);
      setDialogError('');
    },
    onError: (err: unknown) => setDialogError(getApiError(err, 'Cập nhật nhóm quyền thất bại')),
  });

  const deleteMutation = useMutation({
    mutationFn: roleService.deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
    onError: (err: unknown) => alert(getApiError(err, 'Xóa thất bại')),
  });

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedRole(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (role: Role) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm quyền "${role.name}"?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const handleSubmit = (data: { code: string; name: string; description?: string; permissions: string[] }) => {
    if (selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Quản lý Nhóm quyền</h2>
        <Button onClick={handleCreate}>
          <Plus size={16} className="mr-2" />Thêm Nhóm quyền
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{role.name}</h3>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{role.code}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 min-h-[40px] mb-4">
              {role.description || 'Không có mô tả'}
            </p>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md">
                {role.permissions.length} quyền
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(role)} className="h-8 px-2 text-slate-600">
                  <Edit size={14} className="mr-1" /> Sửa
                </Button>
                {role.id !== 1 && role.id !== 2 && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(role)} className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditRoleDialog
        role={selectedRole}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        error={dialogError}
      />
    </div>
  );
}
