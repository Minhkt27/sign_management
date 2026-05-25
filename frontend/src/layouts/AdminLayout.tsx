import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authStore } from '@/app/store/authStore';
import { authService } from '@/services/authService';
import { LayoutDashboard, Signpost, Ticket, LogOut, Tags, Users, KeyRound } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    authService.logout().then(() => navigate('/login'));
  };

  const navItems = [
    { to: '/admin/assets', label: 'Quản lý Biển báo', icon: Signpost },
    { to: '/admin/assets/tree', label: 'Sơ đồ Vị trí (Tree)', icon: LayoutDashboard },
    { to: '/admin/sign-types', label: 'Quản lý Loại biển', icon: Tags },
    { to: '/admin/tickets', label: 'Phiếu Bảo trì', icon: Ticket },
    { to: '/admin/users', label: 'Quản lý Nhân viên', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-slate-100 text-left font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        {/* Brand */}
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
            <Signpost size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-wide">Hospital Signage</h1>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Admin Control</span>
          </div>
        </div>

        {/* User profile brief */}
        {user && (
          <div className="p-4 border-b border-slate-100 flex items-center space-x-3 bg-slate-50">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[110px]">{user.fullName}</p>
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                className="text-xs text-blue-500 hover:text-blue-700 font-semibold uppercase tracking-wider flex items-center gap-1 transition-colors"
              >
                <KeyRound size={10} />
                Đổi mật khẩu
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/assets'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 text-slate-500 hover:text-red-600 hover:bg-red-50 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-red-200 transition-all duration-150 text-sm font-medium"
          >
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shadow-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Bảng điều khiển quản trị</h2>
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium bg-slate-100 py-1.5 px-3 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Hệ thống trực tuyến</span>
          </div>
        </header>
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>

      <ChangePasswordModal open={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
}
