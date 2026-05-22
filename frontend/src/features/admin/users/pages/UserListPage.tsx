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
import { Plus, UserCheck, UserX, KeyRound } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const PAGE_SIZE = 15;

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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getAll,
  });

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

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Nhân viên</h2>
          <p className="text-sm text-slate-500 mt-1">{users.length} tài khoản</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)}>
            <KeyRound size={16} className="mr-2" />
            Đổi mật khẩu
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={open => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" />Thêm kỹ thuật viên</Button>
            </DialogTrigger>
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
          <Input
            placeholder="Tìm theo tên hoặc tên đăng nhập..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : (
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
              {paginated.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-slate-500">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role === 'ADMIN' ? 'Quản trị' : 'Kỹ thuật viên'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}
                      className={user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                      {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {currentUser?.id !== user.id && (
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Không tìm thấy tài khoản nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
