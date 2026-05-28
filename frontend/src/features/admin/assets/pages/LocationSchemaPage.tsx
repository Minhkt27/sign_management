import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Network, Map } from 'lucide-react';

export default function LocationSchemaPage() {
  const { pathname } = useLocation();
  const isEditor = pathname.endsWith('/edit');

  return (
    <div className="flex flex-col gap-0">
      {!isEditor && (
        <div className="flex gap-1 border-b border-slate-200 mb-6 -mt-2">
          <NavLink
            to="/admin/assets/tree"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <Network size={16} /> Dạng cây
          </NavLink>
          <NavLink
            to="/admin/assets/tree/map"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <Map size={16} /> Theo bản đồ
          </NavLink>
        </div>
      )}
      <Outlet />
    </div>
  );
}
