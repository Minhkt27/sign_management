import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserCheck, UserX, RotateCcw, ShieldAlert, Pencil, Trash2, MoreHorizontal, Building2 } from 'lucide-react';
import { User, Role, Hospital } from '@/shared/types';
import { useAdminStore } from '@/app/store/adminStore';
import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';
import { authStore, isSuperAdmin } from '@/app/store/authStore';

interface Props {
  users: User[];
  roles: Role[];
  isLoading: boolean;
  currentUserId: number | undefined;
  onToggleActive: (user: User) => void;
  onResetPassword: (user: User) => void;
  onEditRole: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  isTogglePending: boolean;
  isResetPending: boolean;
  isDeletePending: boolean;
}

export function UserTable({ users, roles, isLoading, currentUserId, onToggleActive, onResetPassword, onEditRole, onEditUser, onDeleteUser, isTogglePending, isResetPending, isDeletePending }: Props) {
  const { selectedHospitalId } = useAdminStore();
  const token = authStore.getToken();
  const isSuper = isSuperAdmin(token);

  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ['all-hospitals'],
    queryFn: hospitalService.getAllHospitals,
    enabled: isSuper && selectedHospitalId === 'ALL',
  });

  const getHospitalName = (id?: number) => {
    if (!id || !hospitals) return '—';
    const h = hospitals.find(x => x.id === id);
    return h ? h.name : '—';
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Đang tải...</div>;
  }

  const getRoleName = (roleId: number) => {
    return roles.find(r => r.id === roleId)?.name || 'Không xác định';
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Họ và tên</TableHead>
            <TableHead>Tên đăng nhập</TableHead>
            <TableHead>Số điện thoại</TableHead>
            {isSuper && selectedHospitalId === 'ALL' && <TableHead>Bệnh viện</TableHead>}
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
              <TableCell className="text-slate-600">{user.phone || <span className="text-slate-300">—</span>}</TableCell>
              {isSuper && selectedHospitalId === 'ALL' && (
                <TableCell className="text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[120px]" title={getHospitalName(user.hospitalId)}>
                      {getHospitalName(user.hospitalId)}
                    </span>
                  </div>
                </TableCell>
              )}
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <Badge variant={user.roleId === 1 ? 'default' : 'secondary'} className="text-sm px-2.5 h-6">
                    {getRoleName(user.roleId)}
                  </Badge>
                  {user.customPermissions && user.customPermissions.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">+{user.customPermissions.length} quyền riêng</span>
                  )}
                </div>
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
                <div className="flex items-center justify-end gap-1.5">
                  {/* Sửa — hiện cho tất cả */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditUser(user)}
                    className="text-slate-600 border-slate-200 hover:bg-slate-50"
                  >
                    <Pencil size={14} className="mr-1" />Sửa
                  </Button>

                  {/* Khóa/Mở — chỉ hiện với người khác */}
                  {currentUserId !== user.id && (
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
                        ? <><UserX size={14} className="mr-1" />Khóa</>
                        : <><UserCheck size={14} className="mr-1" />Mở</>}
                    </Button>
                  )}

                  {/* Dropdown các thao tác phụ — chỉ hiện với người khác */}
                  {currentUserId !== user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors">
                        <MoreHorizontal size={15} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 shadow-lg rounded-lg">
                        <DropdownMenuItem onClick={() => onEditRole(user)} className="cursor-pointer">
                          <ShieldAlert size={14} className="mr-2 text-blue-600" />
                          <span>Phân quyền</span>
                        </DropdownMenuItem>
                        {user.roleId !== 1 && (
                          <DropdownMenuItem
                            onClick={() => onResetPassword(user)}
                            disabled={isResetPending}
                            className="cursor-pointer"
                          >
                            <RotateCcw size={14} className="mr-2 text-amber-600" />
                            <span>Reset mật khẩu</span>
                          </DropdownMenuItem>
                        )}
                        {user.roleId !== 1 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeleteUser(user)}
                              disabled={isDeletePending}
                              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 size={14} className="mr-2" />
                              <span>Xóa tài khoản</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={selectedHospitalId === 'ALL' ? 7 : 6} className="text-center text-slate-400 py-8">
                Không tìm thấy tài khoản nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
