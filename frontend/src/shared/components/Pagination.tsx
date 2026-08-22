import { useState } from 'react';
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
  const [jumpValue, setJumpValue] = useState('');

  if (totalCount === 0) return null;

  const total = totalPages || 1;

  const jump = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const clamped = Math.min(Math.max(n, 1), total) - 1; // convert to 0-indexed
    onPageChange(clamped);
    setJumpValue('');
  };

  return (
    <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
      <span className="text-sm text-slate-500">
        {`${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalCount)}`} / <strong>{totalCount}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="text-sm px-4 py-2 rounded-lg disabled:opacity-40"
        >
          ← Trước
        </Button>

        <span className="text-sm font-semibold text-slate-700 px-1 whitespace-nowrap">
          Trang {page + 1} / {total}
        </span>

        <Button
          variant="outline" size="sm"
          disabled={page >= total - 1}
          onClick={() => onPageChange(page + 1)}
          className="text-sm px-4 py-2 rounded-lg disabled:opacity-40"
        >
          Sau →
        </Button>

        {total > 2 && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
            <span className="text-xs text-slate-400 whitespace-nowrap">Đến trang</span>
            <input
              type="text"
              inputMode="numeric"
              value={jumpValue}
              onChange={e => setJumpValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') jump(jumpValue); }}
              onBlur={() => setJumpValue('')}
              placeholder={String(page + 1)}
              className="w-12 text-center text-sm border border-slate-300 rounded-lg py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        )}
      </div>
    </div>
  );
}
