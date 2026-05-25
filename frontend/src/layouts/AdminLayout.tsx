import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authStore } from '@/app/store/authStore';
import { authService } from '@/services/authService';
import { LayoutDashboard, Signpost, Ticket, LogOut, Tags, Users, KeyRound } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore.getUser();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    authService.logout().then(() => navigate('/login'));
  };

  const navItems = [
    { to: '/admin/assets/tree', label: 'Sơ đồ Vị trí', icon: LayoutDashboard, end: false },
    { to: '/admin/assets', label: 'Quản lý Biển báo', icon: Signpost, end: true },
    { to: '/admin/sign-types', label: 'Quản lý Loại biển', icon: Tags, end: false },
    { to: '/admin/tickets', label: 'Phiếu Bảo trì', icon: Ticket, end: false },
    { to: '/admin/users', label: 'Quản lý Nhân viên', icon: Users, end: false },
  ];

  const pageTitle = navItems.find(item => location.pathname.startsWith(item.to))?.label ?? 'Bảng điều khiển';

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar Spacer */}
      <div className="w-16 shrink-0 h-full" />

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 z-20 group w-16 hover:w-56 transition-[width] duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col shadow-sm overflow-hidden">

        {/* Brand */}
        <div className="h-16 border-b border-slate-100 flex items-center pl-[14px] shrink-0">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm shrink-0">
            <Signpost size={20} />
          </div>
          <div className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-200 group-hover:delay-150">
            <div className="ml-3 min-w-0">
              <p className="text-sm font-bold text-slate-800 whitespace-nowrap">Hospital Signage</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest whitespace-nowrap">Admin Control</p>
            </div>
          </div>
        </div>

        {/* User avatar */}
        {user && (
          <div className="border-b border-slate-100 flex items-center bg-slate-50 shrink-0 py-3 pl-[14px]">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
              {user.fullName.charAt(0)}
            </div>
            <div className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-200 group-hover:delay-150">
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName}</p>
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <KeyRound size={10} className="shrink-0" />
                  Đổi mật khẩu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center py-2.5 rounded-xl transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`
                }
              >
                <div className="w-10 flex items-center justify-center shrink-0">
                  <Icon size={19} />
                </div>
                <div className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[160px] group-hover:opacity-100 transition-all duration-200 group-hover:delay-150">
                  <span className="text-sm font-semibold whitespace-nowrap pr-3">{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="py-2 px-2 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="w-full flex items-center py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 text-sm font-medium"
          >
            <div className="w-10 flex items-center justify-center shrink-0">
              <LogOut size={17} />
            </div>
            <div className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[160px] group-hover:opacity-100 transition-all duration-200 group-hover:delay-150">
              <span className="whitespace-nowrap pr-3">Đăng xuất</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shadow-slate-100">
          <h2 className="text-xl font-bold text-slate-800">{pageTitle}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100 py-1.5 px-3 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
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
