import { useState } from 'react';
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
import ChangePasswordModal from '@/components/ChangePasswordModal';

const PAGE_SIZE = 10;

export default function UserListPage() {
  const queryClient = useQueryClient();
  const currentUser = authStore.getUser();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  const { data: pagedUsers, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => userService.getPage(page, PAGE_SIZE, search),
  });

  const users = pagedUsers?.content ?? [];
  const totalPages = pagedUsers?.totalPages ?? 0;
  const totalElements = pagedUsers?.totalElements ?? 0;

  const createMutation = useMutation({
    mutationFn: userService.createTechnician,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      setCreateError('');
    },
    onError: (err: unknown) => setCreateError(getApiError(err, 'Tạo tài khoản thất bại')),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => userService.setActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => userService.resetPassword(id),
    onSuccess: () => alert('Đã reset mật khẩu về: 12345678'),
    onError: () => alert('Reset mật khẩu thất bại.'),
  });

  const handleToggleActive = (user: User) => {
    toggleActiveMutation.mutate({ id: user.id, active: !user.isActive });
  };

  const handleResetPassword = (user: User) => {
    if (window.confirm(`Reset mật khẩu tài khoản "${user.username}" về 12345678?`)) {
      resetPasswordMutation.mutate(user.id);
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
            <Plus size={16} className="mr-2" />Thêm kỹ thuật viên
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
          isLoading={isLoading}
          currentUserId={currentUser?.id}
          onToggleActive={handleToggleActive}
          onResetPassword={handleResetPassword}
          isTogglePending={toggleActiveMutation.isPending}
          isResetPending={resetPasswordMutation.isPending}
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

      <ChangePasswordModal open={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
}
