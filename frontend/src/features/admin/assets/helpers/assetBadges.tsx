import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Wrench, ShieldAlert } from 'lucide-react';
import { Asset } from '@/shared/types';

export function renderAssetStatusBadge(status: Asset['status']) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><CheckCircle2 size={12} /><span>Hoạt động</span></Badge>;
    case 'DAMAGED':
      return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><AlertCircle size={12} /><span>Báo hỏng</span></Badge>;
    case 'REPAIRING':
      return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><Wrench size={12} /><span>Sửa chữa</span></Badge>;
    case 'SCRAPPED':
      return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center space-x-1 w-fit text-xs px-2 py-0.5"><ShieldAlert size={12} /><span>Đã thanh lý</span></Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
