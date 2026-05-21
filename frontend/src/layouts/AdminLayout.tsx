import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authStore } from '@/app/store/authStore';
import { LayoutDashboard, Signpost, Ticket, LogOut, Tags } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = authStore.getUser();

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin/assets', label: 'Quản lý Biển báo', icon: Signpost },
    { to: '/admin/assets/tree', label: 'Sơ đồ Vị trí (Tree)', icon: LayoutDashboard },
    { to: '/admin/sign-types', label: 'Quản lý Loại biển', icon: Tags },
    { to: '/admin/tickets', label: 'Phiếu Bảo trì', icon: Ticket },
  ];

  return (
    <div className="flex h-screen bg-slate-100 text-left font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Signpost size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Hospital Signage</h1>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">Admin Control</span>
          </div>
        </div>

        {/* User profile brief */}
        {user && (
          <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/20">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white truncate max-w-[150px]">{user.fullName}</p>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Administrator</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/assets'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-medium'
                      : 'hover:bg-slate-800/60 hover:text-white'
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
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-950/30 hover:bg-red-600 text-red-400 hover:text-white py-3 px-4 rounded-xl border border-red-950 hover:border-red-600 transition-all duration-200 text-sm font-medium"
          >
            <LogOut size={16} />
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
            <span>Hệ thống trực tuyến (Demo)</span>
          </div>
        </header>
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
