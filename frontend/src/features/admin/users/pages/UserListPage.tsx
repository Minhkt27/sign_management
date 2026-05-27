import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { authStore } from '@/app/store/authStore';
import { User } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, UserCheck, UserX, KeyRound, RotateCcw, Search } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const PAGE_SIZE = 10;

export default function UserListPage() {
  const queryClient = useQueryClient();
  const currentUser = authStore.getUser();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

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
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Tạo tài khoản thất bại');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      userService.setActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => userService.resetPassword(id),
    onSuccess: () => alert('Đã reset mật khẩu về: 12345678'),
    onError: () => alert('Reset mật khẩu thất bại.'),
  });

  const handleResetPassword = (user: User) => {
    if (window.confirm(`Reset mật khẩu tài khoản "${user.username}" về 12345678?`)) {
      resetPasswordMutation.mutate(user.id);
    }
  };

  const resetForm = () => {
    setUsername('');
    setFullName('');
    setPassword('');
    setConfirmPassword('');
    setFormError('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    createMutation.mutate({ username, fullName, password });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{totalElements} tài khoản</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)}>
            <KeyRound size={16} className="mr-2" />
            Đổi mật khẩu
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={open => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger render={
              <Button><Plus size={16} className="mr-2" />Thêm kỹ thuật viên</Button>
            } />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Thêm kỹ thuật viên mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Tên đăng nhập</label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Họ và tên</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                {formError && <p className="text-sm text-red-500">{formError}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-slate-800">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="text-sm px-2.5 h-6">
                      {user.role === 'ADMIN' ? 'Quản trị' : 'Kỹ thuật viên'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}
                      className={`text-sm px-2.5 h-6 ${user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}>
                      {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {currentUser?.id !== user.id && (
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== 'ADMIN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resetPasswordMutation.isPending}
                            onClick={() => handleResetPassword(user)}
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          >
                            <RotateCcw size={14} className="mr-1" />Reset mật khẩu
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={toggleActiveMutation.isPending}
                          onClick={() => toggleActiveMutation.mutate({ id: user.id, active: !user.isActive })}
                          className={user.isActive
                            ? 'text-red-600 border-red-200 hover:bg-red-50'
                            : 'text-green-600 border-green-200 hover:bg-green-50'}
                        >
                          {user.isActive
                            ? <><UserX size={14} className="mr-1" />Vô hiệu hóa</>
                            : <><UserCheck size={14} className="mr-1" />Kích hoạt</>}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Không tìm thấy tài khoản nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Trang {page + 1} / {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          </div>
        )}
      </div>

      <ChangePasswordModal open={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
}
