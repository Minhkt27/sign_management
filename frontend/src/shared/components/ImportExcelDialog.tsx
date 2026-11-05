import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileUp, Download, CheckCircle2, AlertTriangle, MinusCircle, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { importService, ImportResult, ImportType } from '@/services/importService';
import { hospitalService } from '@/services/hospitalService';
import { authStore, isSuperAdmin } from '@/app/store/authStore';
import { useAdminStore } from '@/app/store/adminStore';
import { getApiError } from '@/shared/helpers/apiError';

interface Props {
  type: ImportType;
  /** Tên loại dữ liệu, ví dụ "vị trí", "biển báo". */
  label: string;
  /** Query key cần làm mới sau khi nhập xong. */
  invalidateKeys: string[][];
}

const STATUS_STYLE = {
  CREATE: { icon: PlusCircle, text: 'text-emerald-700', label: 'Tạo mới' },
  SKIP: { icon: MinusCircle, text: 'text-slate-500', label: 'Bỏ qua' },
  ERROR: { icon: AlertTriangle, text: 'text-red-600', label: 'Lỗi' },
} as const;

/**
 * Hộp thoại nhập Excel dùng chung cho mọi loại dữ liệu: tải file mẫu → chọn file → xem trước
 * → nhập. Còn dòng lỗi thì nút Nhập bị khoá — và server cũng từ chối ghi.
 */
export function ImportExcelDialog({ type, label, invalidateKeys }: Props) {
  const queryClient = useQueryClient();
  const { selectedHospitalId } = useAdminStore();
  const isSuper = isSuperAdmin(authStore.getToken());
  const hospitalId = isSuper ? selectedHospitalId : null;

  const { data: hospitals = [] } = useQuery({
    queryKey: ['all-hospitals'],
    queryFn: hospitalService.getAllHospitals,
    enabled: isSuper,
  });
  const targetName = isSuper ? hospitals.find(h => h.id === selectedHospitalId)?.name : null;

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'template' | 'preview' | 'import' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const downloadTemplate = async () => {
    setBusy('template');
    try {
      await importService.downloadTemplate(type, `mau-nhap-${type}.xlsx`, hospitalId);
    } catch (e) {
      toast.error(getApiError(e, 'Không tải được file mẫu.'));
    } finally {
      setBusy(null);
    }
  };

  const runPreview = async (picked: File) => {
    setFile(picked);
    setResult(null);
    setBusy('preview');
    try {
      setResult(await importService.preview(type, picked, hospitalId));
    } catch (e) {
      toast.error(getApiError(e, 'Không kiểm tra được file.'));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setBusy('import');
    try {
      const r = await importService.importFile(type, file, hospitalId);
      setResult(r);
      if (r.committed) {
        invalidateKeys.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
        const created = Object.entries(r.summary).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ');
        toast.success(`Đã nhập xong${created ? `: ${created}` : ''}.`);
        handleOpenChange(false);
      } else {
        // Dữ liệu trên server có thể đã đổi kể từ lúc xem trước — hiện kết quả mới nhất.
        toast.error('Không nhập được vì còn dòng lỗi. Không có dòng nào được ghi.');
      }
    } catch (e) {
      toast.error(getApiError(e, 'Nhập thất bại. Không có dòng nào được ghi.'));
    } finally {
      setBusy(null);
    }
  };

  const blocked = isSuper && selectedHospitalId == null;
  const counts = result
    ? {
        CREATE: result.rows.filter(r => r.status === 'CREATE').length,
        SKIP: result.rows.filter(r => r.status === 'SKIP').length,
        ERROR: result.errorCount,
      }
    : null;
  // Lỗi lên đầu để người dùng không phải cuộn tìm.
  const sortedRows = result
    ? [...result.rows].sort((a, b) => (a.status === 'ERROR' ? 0 : 1) - (b.status === 'ERROR' ? 0 : 1) || a.row - b.row)
    : [];
  const canImport = !!result && result.errorCount === 0 && (counts?.CREATE ?? 0) > 0 && !busy;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="outline" className="rounded-xl py-2.5 flex items-center gap-2 font-semibold text-slate-700 border-slate-300">
          <FileUp size={17} />
          <span>Nhập từ Excel</span>
        </Button>
      } />

      <DialogContent className="bg-white sm:max-w-[720px] rounded-2xl border-slate-100 p-0 overflow-hidden shadow-2xl">
        <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileUp className="text-blue-600" size={20} />
              <span>Nhập {label} từ Excel</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              {isSuper
                ? (targetName
                    ? <>Dữ liệu sẽ được nhập vào <b className="text-slate-800">{targetName}</b>.</>
                    : 'Hãy chọn bệnh viện ở ô chọn viện phía trên trước khi nhập.')
                : 'Dữ liệu sẽ được nhập vào bệnh viện của bạn.'}
              {' '}Nếu còn dòng lỗi, hệ thống không ghi dòng nào.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex items-center justify-between gap-3">
              <span><b>1.</b> Tải file mẫu và điền dữ liệu (xem sheet "Hướng dẫn").</span>
              <Button size="sm" variant="outline" onClick={downloadTemplate} disabled={blocked || busy !== null}
                className="flex items-center gap-1.5 shrink-0">
                {busy === 'template' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Tải file mẫu
              </Button>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                <b>2.</b> Chọn file đã điền{file ? <>: <span className="text-blue-700">{file.name}</span></> : '.'}
              </span>
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={blocked || busy !== null}
                className="flex items-center gap-1.5 shrink-0">
                {busy === 'preview' ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                {file ? 'Chọn file khác' : 'Chọn file'}
              </Button>
              <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) runPreview(f); }} />
            </li>
          </ol>

          {result && counts && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {(['CREATE', 'SKIP', 'ERROR'] as const).map(s => (
                  <div key={s} className="rounded-xl border border-slate-200 py-2">
                    <div className={`text-xl font-bold ${STATUS_STYLE[s].text}`}>{counts[s]}</div>
                    <div className="text-xs text-slate-500">{STATUS_STYLE[s].label}</div>
                  </div>
                ))}
              </div>

              {Object.keys(result.summary).length > 0 && (
                <p className="text-sm text-slate-600">
                  Sẽ tạo:{' '}
                  {Object.entries(result.summary).map(([k, v]) => `${v} ${k.replace(' tạo mới', '').toLowerCase()}`).join(', ')}.
                </p>
              )}

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {sortedRows.map((r, i) => {
                  const st = STATUS_STYLE[r.status];
                  const Icon = st.icon;
                  return (
                    <div key={`${r.row}-${i}`} className="flex items-start gap-2 px-3 py-2 text-sm">
                      <Icon size={15} className={`${st.text} mt-0.5 shrink-0`} />
                      <span className="text-slate-400 w-16 shrink-0">{r.row > 0 ? `Dòng ${r.row}` : 'File'}</span>
                      <span className={r.status === 'ERROR' ? 'text-red-700' : 'text-slate-700'}>{r.message}</span>
                    </div>
                  );
                })}
              </div>

              {result.errorCount > 0 && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  Còn {result.errorCount} dòng lỗi. Sửa trong file rồi bấm "Chọn file khác" để kiểm tra lại.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy === 'import'}>Huỷ</Button>
          <Button onClick={runImport} disabled={!canImport}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5">
            {busy === 'import' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {counts ? `Nhập ${counts.CREATE} dòng` : 'Nhập'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
