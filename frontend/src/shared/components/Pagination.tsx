import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({ page, totalPages, totalCount, pageSize, onPageChange, itemLabel = 'mục' }: Props) {
  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-sm text-slate-500">
        {`${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalCount)}`} / <strong>{totalCount}</strong> {itemLabel}
      </span>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)} className="text-sm px-4 py-2 rounded-lg disabled:opacity-40">
          ← Trước
        </Button>
        <span className="text-sm font-semibold text-slate-700 px-2">
          Trang {page + 1} / {totalPages || 1}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} className="text-sm px-4 py-2 rounded-lg disabled:opacity-40">
          Sau →
        </Button>
      </div>
    </div>
  );
}
