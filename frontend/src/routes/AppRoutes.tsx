import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../features/auth/pages/LoginPage';
import AdminLayout from '../layouts/AdminLayout';
import MobileLayout from '../layouts/MobileLayout';
import AssetListPage from '../features/admin/assets/pages/AssetListPage';
import AssetTreePage from '../features/admin/assets/pages/AssetTreePage';
import AssetDetailPage from '../features/admin/assets/pages/AssetDetailPage';
import LocationSchemaPage from '../features/admin/assets/pages/LocationSchemaPage';
import TicketListPage from '../features/admin/tickets/pages/TicketListPage';
import TicketAssignPage from '../features/admin/tickets/pages/TicketAssignPage';
import TicketDetailPage from '../features/admin/tickets/pages/TicketDetailPage';
import TechDashboardPage from '../features/technician/workflow/pages/TechDashboardPage';
import TaskDetailPage from '../features/technician/workflow/pages/TaskDetailPage';
import AssetBrowsePage from '../features/technician/workflow/pages/AssetBrowsePage';
import ScanLandingPage from '../features/technician/workflow/pages/ScanLandingPage';
import SignTypeListPage from '../features/admin/sign-types/pages/SignTypeListPage';
import UserListPage from '../features/admin/users/pages/UserListPage';
import MapListPage from '../features/admin/map/pages/MapListPage';
import MapEditorPage from '../features/admin/map/pages/MapEditorPage';
import WayfindingPage from '../features/map/pages/WayfindingPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes (Protected for ADMIN) */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
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
        </Route>
      </Route>

      {/* Technician routes (Protected for TECHNICAL) */}
      <Route element={<ProtectedRoute allowedRoles={['TECHNICAL']} />}>
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

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/admin/assets" replace />} />
      <Route path="*" element={<div className="p-8 text-center text-gray-500 font-medium">Page Not Found</div>} />
    </Routes>
  );
}
