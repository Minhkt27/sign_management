import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  materialFilter: string;
  onMaterialFilterChange: (value: string) => void;
  children?: React.ReactNode;
}

export function AssetFilters({
  search, onSearchChange,
  statusFilter, onStatusFilterChange,
  materialFilter, onMaterialFilterChange,
  children,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center space-x-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <Input
            placeholder="Tìm mã hoặc tên biển..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-11 pr-4 py-3 text-base text-slate-800 placeholder:text-slate-400 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">Tất cả Trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="DAMAGED">Báo hỏng</option>
          <option value="REPAIRING">Đang sửa</option>
          <option value="SCRAPPED">Đã thanh lý</option>
        </select>

        <select
          value={materialFilter}
          onChange={(e) => onMaterialFilterChange(e.target.value)}
          className="border border-slate-200 bg-white text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">Tất cả Chất liệu</option>
          <option value="MICA">MICA</option>
          <option value="INOX">INOX</option>
          <option value="LED">LED</option>
          <option value="ALU">ALU</option>
        </select>

        {children}
      </div>
    </div>
  );
}
