import { Navigate, Outlet } from 'react-router-dom';
import { authStore, getPermissionsFromToken } from '../app/store/authStore';

interface ProtectedRouteProps {
  allowedAuthorities?: string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({ allowedAuthorities, fallbackPath }: ProtectedRouteProps) {
  const user = authStore.getUser();
  const token = authStore.getToken();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  const permissions = getPermissionsFromToken(token);

  if (allowedAuthorities && allowedAuthorities.length > 0) {
    const hasAccess = allowedAuthorities.some(auth => permissions.includes(auth));
    if (!hasAccess) {
      // If they don't have access, fallback to tech dashboard or asset view depending on what they have
      const path = fallbackPath || (permissions.includes('TICKET_VIEW') && !permissions.includes('ASSET_VIEW') ? '/tech/dashboard' : '/admin/assets');
      return <Navigate to={path} replace />;
    }
  }

  return <Outlet />;
}

