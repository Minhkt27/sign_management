import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, UserX, RotateCcw } from 'lucide-react';
import { User } from '@/shared/types';

interface Props {
  users: User[];
  isLoading: boolean;
  currentUserId: number | undefined;
  onToggleActive: (user: User) => void;
  onResetPassword: (user: User) => void;
  isTogglePending: boolean;
  isResetPending: boolean;
}

export function UserTable({ users, isLoading, currentUserId, onToggleActive, onResetPassword, isTogglePending, isResetPending }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Đang tải...</div>;
  }

  return (
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
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.fullName}</TableCell>
              <TableCell className="text-slate-800">{user.username}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="text-sm px-2.5 h-6">
                  {user.role === 'ADMIN' ? 'Quản trị' : 'Kỹ thuật viên'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.isActive ? 'default' : 'destructive'}
                  className={`text-sm px-2.5 h-6 ${user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                >
                  {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {currentUserId !== user.id && (
                  <div className="flex items-center justify-end gap-2">
                    {user.role !== 'ADMIN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isResetPending}
                        onClick={() => onResetPassword(user)}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                      >
                        <RotateCcw size={14} className="mr-1" />Reset mật khẩu
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isTogglePending}
                      onClick={() => onToggleActive(user)}
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
  );
}
