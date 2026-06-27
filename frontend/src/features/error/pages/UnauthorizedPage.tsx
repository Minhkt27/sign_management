import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { authStore, getUiModeFromToken, getPermissionsFromToken } from '@/app/store/authStore';
import { authService } from '@/services/authService';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout().then(() => navigate('/login'));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-3">Truy cập bị từ chối</h1>
        
        <p className="text-slate-500 mb-8 leading-relaxed">
          Tài khoản của bạn không có đủ quyền để truy cập vào trang này hoặc tính năng này chưa được kích hoạt. Vui lòng liên hệ với Quản trị viên để được hỗ trợ.
          <br/>
          <span className="text-xs text-slate-400 mt-2 block">
            Debug Info: uiMode={getUiModeFromToken(authStore.getToken())}, 
            perms={JSON.stringify(getPermissionsFromToken(authStore.getToken()))},
            path={window.location.pathname}
          </span>
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors duration-200"
          >
            <ArrowLeft size={18} />
            <span>Quay lại trang trước</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-sm shadow-red-200 transition-colors duration-200"
          >
            <LogOut size={18} />
            <span>Đăng xuất và đăng nhập lại</span>
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-slate-400 font-medium">
        Hospital Signage Management System
      </p>
    </div>
  );
}
