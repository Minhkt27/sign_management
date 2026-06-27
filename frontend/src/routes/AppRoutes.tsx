import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { authStore, getUiModeFromToken } from '../app/store/authStore';
import WayfindingPage from '../features/map/pages/WayfindingPage';
import PatientScanPage from '../features/map/pages/PatientScanPage';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const MobileLayout = lazy(() => import('../layouts/MobileLayout'));
const AssetListPage = lazy(() => import('../features/admin/assets/pages/AssetListPage'));
const AssetTreePage = lazy(() => import('../features/admin/assets/pages/AssetTreePage'));
const AssetDetailPage = lazy(() => import('../features/admin/assets/pages/AssetDetailPage'));
const LocationSchemaPage = lazy(() => import('../features/admin/assets/pages/LocationSchemaPage'));
const TicketListPage = lazy(() => import('../features/admin/tickets/pages/TicketListPage'));
const TicketAssignPage = lazy(() => import('../features/admin/tickets/pages/TicketAssignPage'));
const TicketDetailPage = lazy(() => import('../features/admin/tickets/pages/TicketDetailPage'));
const TechDashboardPage = lazy(() => import('../features/technician/workflow/pages/TechDashboardPage'));
const TaskDetailPage = lazy(() => import('../features/technician/workflow/pages/TaskDetailPage'));
const AssetBrowsePage = lazy(() => import('../features/technician/workflow/pages/AssetBrowsePage'));
const ScanLandingPage = lazy(() => import('../features/technician/workflow/pages/ScanLandingPage'));
const SignTypeListPage = lazy(() => import('../features/admin/sign-types/pages/SignTypeListPage'));
const UserListPage = lazy(() => import('../features/admin/users/pages/UserListPage'));
const RoleListPage = lazy(() => import('../features/admin/users/pages/RoleListPage'));
const MapListPage = lazy(() => import('../features/admin/map/pages/MapListPage'));
const MapEditorPage = lazy(() => import('../features/admin/map/pages/MapEditorPage'));
const UnauthorizedPage = lazy(() => import('../features/error/pages/UnauthorizedPage'));

function RootRedirect() {
  const token = authStore.getToken();
  if (!token) return <Navigate to="/login" replace />;
  const uiMode = getUiModeFromToken(token);
  return <Navigate to={uiMode === 'TECHNICIAN' ? '/tech/dashboard' : '/admin/assets'} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-400">Đang tải trang...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Admin routes */}
        <Route element={<ProtectedRoute allowedAuthorities={['ASSET_VIEW', 'ASSET_MANAGE', 'MAP_VIEW', 'TICKET_VIEW', 'USER_VIEW', 'ROLE_VIEW']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/assets" replace />} />
            <Route path="assets" element={<AssetListPage />} />
            <Route path="assets/tree" element={<LocationSchemaPage />}>
              <Route index element={<AssetTreePage />} />
              <Route path="map" element={<MapListPage />} />
              <Route path="map/:floorId/edit" element={<MapEditorPage />} />
            </Route>
            <Route path="assets/:id" element={<AssetDetailPage />} />
            <Route path="sign-types" element={<SignTypeListPage />} />
            <Route path="tickets" element={<TicketListPage />} />
            <Route path="tickets/assign/:id" element={<TicketAssignPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="users" element={<UserListPage />} />
            <Route path="roles" element={<RoleListPage />} />
          </Route>
        </Route>

        {/* Technician mobile routes */}
        <Route element={<ProtectedRoute allowedAuthorities={['TICKET_VIEW', 'TICKET_CREATE']} fallbackPath="/login" />}>
          <Route path="/tech" element={<MobileLayout />}>
            <Route index element={<Navigate to="/tech/dashboard" replace />} />
            <Route path="dashboard" element={<TechDashboardPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="assets/browse" element={<AssetBrowsePage />} />
            <Route path="assets/:assetCode" element={<ScanLandingPage />} />
          </Route>
        </Route>

        {/* Public map */}
        <Route path="/map" element={<WayfindingPage />} />
        <Route path="/scan/:assetCode" element={<PatientScanPage />} />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<div className="p-8 text-center text-gray-500 font-medium">Page Not Found</div>} />
      </Routes>
    </Suspense>
  );
}
