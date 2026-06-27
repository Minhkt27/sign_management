import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore, getPermissionsFromToken, getUiModeFromToken } from '../app/store/authStore';

interface ProtectedRouteProps {
  allowedAuthorities?: string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({ allowedAuthorities, fallbackPath }: ProtectedRouteProps) {
  const user = authStore.getUser();
  const token = authStore.getToken();
  const location = useLocation();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  const permissions = getPermissionsFromToken(token);

  if (allowedAuthorities && allowedAuthorities.length > 0) {
    const hasAccess = allowedAuthorities.some(auth => permissions.includes(auth));
    if (!hasAccess) {
      // If they don't have access, fallback to tech dashboard or asset view depending on what they have
      const uiMode = getUiModeFromToken(token);
      const defaultPath = uiMode === 'TECHNICIAN' ? '/tech/dashboard' : '/admin/assets';
      const path = fallbackPath || defaultPath;
      
      // Ngăn chặn infinite loop nếu redirect về đúng trang hiện tại hoặc trang admin khi không có quyền admin
      if (location.pathname === path || (path === '/admin/assets' && location.pathname.startsWith('/admin'))) {
        return <Navigate to="/unauthorized" replace />;
      }
      return <Navigate to={path} replace />;
    }
  }

  return <Outlet />;
}

