import { Navigate, Outlet } from 'react-router-dom';
import { authStore } from '../app/store/authStore';

interface ProtectedRouteProps {
  allowedRoles: ('ADMIN' | 'TECHNICAL')[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const user = authStore.getUser();
  const token = authStore.getToken();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/assets' : '/tech/dashboard'} replace />;
  }

  return <Outlet />;
}
