import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { authStore } from '@/app/store/authStore';
import { User } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Plus, Search } from 'lucide-react';
import { Pagination } from '@/shared/components/Pagination';
import { getApiError } from '@/shared/helpers/apiError';
import { UserTable } from '../components/UserTable';
import { CreateUserDialog } from '../components/CreateUserDialog';
import { EditUserDialog } from '../components/EditUserDialog';
import { EditUserRoleDialog } from '../components/EditUserRoleDialog';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { roleService } from '../services/roleService';

const PAGE_SIZE = 10;

export default function UserListPage() {
  const queryClient = useQueryClient();
  const currentUser = authStore.getUser();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '0');
  const setPage = (p: number) => setSearchParams(
    prev => { const n = new URLSearchParams(prev); if (p === 0) n.delete('page'); else n.set('page', String(p)); return n; },
    { replace: true },
  );
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [editRoleError, setEditRoleError] = useState('');

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [editUserError, setEditUserError] = useState('');

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getAllRoles,
  });

  const { data: pagedUsers, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => userService.getPage(page, PAGE_SIZE, search),
  });

  const users = pagedUsers?.content ?? [];
  const totalPages = pagedUsers?.totalPages ?? 0;
  const totalElements = pagedUsers?.totalElements ?? 0;

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      setCreateError('');
    },
    onError: (err: unknown) => setCreateError(getApiError(err, 'Tạo tài khoản thất bại')),
  });

  const editUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { fullName: string; phone?: string } }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUserForEdit(null);
      setEditUserError('');
    },
    onError: (err: unknown) => setEditUserError(getApiError(err, 'Cập nhật tài khoản thất bại')),
  });

  const editRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { roleId: number; customPermissions: string[] } }) =>
      userService.updateRoleAndPermissions(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUserForRole(null);
      setEditRoleError('');
    },
    onError: (err: unknown) => setEditRoleError(getApiError(err, 'Cập nhật quyền thất bại')),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => userService.setActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => userService.resetPassword(id),
    onSuccess: (temporaryPassword) => alert(`Mật khẩu tạm thời: ${temporaryPassword}`),
    onError: () => alert('Reset mật khẩu thất bại.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => alert('Xóa tài khoản thất bại.'),
  });

  const handleToggleActive = (user: User) => {
    const action = user.isActive ? 'khóa' : 'mở khóa';
    if (window.confirm(`Xác nhận ${action} tài khoản "${user.username}"?`)) {
      toggleActiveMutation.mutate({ id: user.id, active: !user.isActive });
    }
  };

  const handleResetPassword = (user: User) => {
    if (window.confirm(`Tạo mật khẩu tạm thời mới cho tài khoản "${user.username}"?`)) {
      resetPasswordMutation.mutate(user.id);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Xóa vĩnh viễn tài khoản "${user.username}"? Hành động này không thể hoàn tác.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{totalElements} tài khoản</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)}>
            <KeyRound size={16} className="mr-2" />Đổi mật khẩu
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} className="mr-2" />Thêm tài khoản
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <Input
              placeholder="Tìm theo tên hoặc tên đăng nhập..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-11 pr-4 py-3 text-base text-slate-800 placeholder:text-slate-400 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <UserTable
          users={users}
          roles={roles}
          isLoading={isLoading || isLoadingRoles}
          currentUserId={currentUser?.id}
          onToggleActive={handleToggleActive}
          onResetPassword={handleResetPassword}
          onEditRole={setSelectedUserForRole}
          onEditUser={setSelectedUserForEdit}
          onDeleteUser={handleDeleteUser}
          isTogglePending={toggleActiveMutation.isPending}
          isResetPending={resetPasswordMutation.isPending}
          isDeletePending={deleteMutation.isPending}
        />

        <div className="px-4 pb-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalElements}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="tài khoản"
          />
        </div>
      </div>

      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={createMutation.mutate}
        isPending={createMutation.isPending}
        error={createError}
      />

      <EditUserDialog
        user={selectedUserForEdit}
        open={selectedUserForEdit !== null}
        onOpenChange={(open) => !open && setSelectedUserForEdit(null)}
        onSubmit={(id, data) => editUserMutation.mutate({ id, data })}
        onClearError={() => setEditUserError('')}
        isPending={editUserMutation.isPending}
        error={editUserError}
      />

      <EditUserRoleDialog
        user={selectedUserForRole}
        open={selectedUserForRole !== null}
        onOpenChange={(open) => !open && setSelectedUserForRole(null)}
        onSubmit={(id, data) => editRoleMutation.mutate({ id, data })}
        isPending={editRoleMutation.isPending}
        error={editRoleError}
      />

      <ChangePasswordModal open={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
}
