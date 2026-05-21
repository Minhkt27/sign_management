import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authStore } from '@/app/store/authStore';
import { ClipboardList, QrCode, LogOut } from 'lucide-react';

export default function MobileLayout() {
  const navigate = useNavigate();
  const user = authStore.getUser();

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-200 shadow-2xl text-left relative pb-16 font-sans">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-5 py-4 sticky top-0 z-20 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
            {user ? user.fullName.charAt(0) : 'K'}
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide">Kỹ thuật viên</h1>
            <p className="text-xs text-blue-200 truncate max-w-[160px]">{user?.fullName || 'Nguyễn Văn Hùng'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          <span className="text-xs text-green-200 font-semibold">Online</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <NavLink 
          to="/tech/dashboard"
          className={({ isActive }) => 
            `flex flex-col items-center space-y-1 py-1 transition-all ${
              isActive ? 'text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <ClipboardList size={22} />
          <span className="text-xs font-medium">Nhiệm vụ</span>
        </NavLink>

        <NavLink 
          to="/tech/assets/browse"
          className={({ isActive }) => 
            `flex flex-col items-center space-y-1 py-1 transition-all ${
              isActive ? 'text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <QrCode size={22} />
          <span className="text-xs font-medium">Tra cứu/Quét</span>
        </NavLink>

        <button 
          onClick={handleLogout}
          className="flex flex-col items-center space-y-1 py-1 text-red-400 hover:text-red-600 transition-all"
        >
          <LogOut size={22} />
          <span className="text-xs font-medium">Đăng xuất</span>
        </button>
      </nav>
    </div>
  );
}
