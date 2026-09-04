import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authStore, getPermissionsFromToken, getHospitalIdFromToken, AuthUser } from '@/app/store/authStore';
import { authService } from '@/services/authService';
import { LayoutDashboard, Signpost, Ticket, LogOut, Tags, Users, KeyRound, Menu, X, Shield, Building2 } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import NotificationBell from '@/components/NotificationBell';
import { useAdminStore, AdminProvider } from '@/app/store/adminStore';
import { useQuery } from '@tanstack/react-query';
import { hospitalService } from '@/services/hospitalService';

import { Hospital } from '@/shared/types';

type NavItem = { to: string; label: string; icon: React.ElementType; end: boolean; reqAuth: string };

interface SidebarContentProps {
  user: AuthUser | null;
  navItems: NavItem[];
  showHospitalSelector: boolean;
  hospitals: Hospital[] | undefined;
  selectedHospitalId: number | null;
  setSelectedHospitalId: (id: number | null) => void;
  onNavClick?: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

function SidebarContent({ user, navItems, showHospitalSelector, hospitals, selectedHospitalId, setSelectedHospitalId, onNavClick, onChangePassword, onLogout }: SidebarContentProps) {
  return (
    <>
      <div className="h-16 border-b border-slate-100 flex items-center pl-4 shrink-0">
        <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm shrink-0">
          <Signpost size={20} />
        </div>
        <div className="ml-3 min-w-0">
          <p className="text-sm font-bold text-slate-800 whitespace-nowrap">Hospital Signage</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest whitespace-nowrap">Admin Control</p>
        </div>
      </div>

      {showHospitalSelector && hospitals && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <select
            value={selectedHospitalId ?? ''}
            onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
            className="w-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 py-1.5 px-3 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-sm truncate"
          >
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      )}

      {user && (
        <div className="border-b border-slate-100 flex items-center bg-slate-50 shrink-0 py-3 pl-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {user.fullName.charAt(0)}
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName}</p>
            <button
              onClick={() => { onChangePassword(); onNavClick?.(); }}
              className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <KeyRound size={10} className="shrink-0" />
              Đổi mật khẩu
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center py-2.5 px-3 rounded-xl transition-colors duration-150 gap-3 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              <Icon size={19} className="shrink-0" />
              <span className="text-base font-semibold whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="py-2 px-2 border-t border-slate-100 shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center py-2.5 px-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 text-sm font-medium gap-3"
        >
          <LogOut size={17} className="shrink-0" />
          <span className="whitespace-nowrap">Đăng xuất</span>
        </button>
      </div>
    </>
  );
}

function AdminLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore.getUser();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { selectedHospitalId, setSelectedHospitalId } = useAdminStore();

  const token = authStore.getToken();
  const permissions = getPermissionsFromToken(token);
  const isSuperAdmin = permissions.includes('HOSPITAL_MANAGE');
  const userHospitalId = getHospitalIdFromToken(token);

  const { data: hospitals } = useQuery({
    queryKey: ['all-hospitals'],
    queryFn: hospitalService.getAllHospitals,
    enabled: isSuperAdmin,
  });

  const { data: myHospital } = useQuery({
    queryKey: ['my-hospital', userHospitalId],
    queryFn: () => hospitalService.getHospitalById(userHospitalId!),
    enabled: !isSuperAdmin && !!userHospitalId,
  });

  // SUPER_ADMIN luôn phải thao tác trong phạm vi đúng 1 bệnh viện — không còn tùy chọn
  // "Tất cả bệnh viện". Nếu chưa chọn, hoặc viện đã chọn trước đó không còn tồn tại,
  // tự động chọn viện đầu tiên trong danh sách.
  useEffect(() => {
    if (!isSuperAdmin || !hospitals || hospitals.length === 0) return;
    const stillValid = selectedHospitalId != null && hospitals.some(h => h.id === selectedHospitalId);
    if (!stillValid) {
      setSelectedHospitalId(hospitals[0].id);
    }
  }, [isSuperAdmin, hospitals, selectedHospitalId, setSelectedHospitalId]);

  const handleLogout = () => {
    authService.logout().then(() => navigate('/login'));
  };

  const allNavItems = [
    { to: '/admin/assets/tree', label: 'Sơ đồ Vị trí', icon: LayoutDashboard, end: false, reqAuth: 'MAP_VIEW' },
    { to: '/admin/assets', label: 'Quản lý Biển báo', icon: Signpost, end: true, reqAuth: 'ASSET_VIEW' },
    { to: '/admin/sign-types', label: 'Quản lý Loại biển', icon: Tags, end: false, reqAuth: 'ASSET_MANAGE' },
    { to: '/admin/tickets', label: 'Phiếu Bảo trì', icon: Ticket, end: false, reqAuth: 'TICKET_VIEW' },
    { to: '/admin/users', label: 'Quản lý Nhân viên', icon: Users, end: false, reqAuth: 'USER_VIEW' },
    { to: '/admin/roles', label: 'Quản lý Nhóm quyền', icon: Shield, end: false, reqAuth: 'ROLE_VIEW' },
    { to: '/admin/hospitals', label: 'Quản lý Bệnh viện', icon: Building2, end: false, reqAuth: 'HOSPITAL_MANAGE' },
  ];

  const navItems = allNavItems.filter(item => permissions.includes(item.reqAuth));

  const pageTitle = navItems.find(item => location.pathname.startsWith(item.to))?.label ?? 'Bảng điều khiển';
  const showHospitalSelector = isSuperAdmin && !location.pathname.startsWith('/admin/hospitals');

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">

      {/* ── Desktop sidebar (hover-to-expand, hidden on mobile) ── */}
      <div className="hidden md:block w-16 shrink-0 h-full" />
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-20 group w-16 hover:w-56 transition-[width] duration-300 ease-in-out bg-white border-r border-slate-200 flex-col shadow-sm overflow-hidden">
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

        {showHospitalSelector && hospitals && (
          <div className="border-b border-slate-100 flex items-center bg-slate-50/80 shrink-0 py-3 pl-[14px]">
            <div className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-200 group-hover:delay-150 w-full pr-3">
              <div className="ml-3 min-w-0 w-full">
                <select
                  value={selectedHospitalId ?? ''}
                  onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 py-2 px-2 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-sm truncate"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

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
                  <span className="text-base font-semibold whitespace-nowrap pr-3">{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

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

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Signpost size={16} />
            </div>
            <span className="text-sm font-bold text-slate-800">Hospital Signage</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <SidebarContent
              user={user}
              navItems={navItems}
              showHospitalSelector={showHospitalSelector}
              hospitals={hospitals}
              selectedHospitalId={selectedHospitalId}
              setSelectedHospitalId={setSelectedHospitalId}
              onNavClick={() => setMobileOpen(false)}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onLogout={handleLogout}
            />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200/80 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shadow-slate-100 gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-base md:text-xl font-bold text-slate-800 truncate flex items-center">
              {pageTitle}
              {!isSuperAdmin && myHospital && (
                <>
                  <span className="mx-3 w-px h-5 bg-slate-300 hidden sm:block"></span>
                  <span className="text-sm font-medium text-slate-500 hidden sm:block truncate max-w-[200px] md:max-w-[400px]">
                    {myHospital.name}
                  </span>
                </>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100 py-1.5 px-3 rounded-full shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Trực tuyến</span>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8 flex-1 min-w-0">
          <Outlet />
        </div>
      </main>

      <ChangePasswordModal open={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminLayoutInner />
    </AdminProvider>
  );
}
