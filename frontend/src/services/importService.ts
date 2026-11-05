import { apiClient } from './apiClient';

/** Loại dữ liệu nhập được từ Excel — khớp với ImportHandler.type() phía server. */
export type ImportType = 'locations' | 'assets';

export type ImportRowStatus = 'CREATE' | 'SKIP' | 'ERROR';

export interface ImportResult {
  type: ImportType;
  hospitalId: number;
  totalRows: number;
  errorCount: number;
  /** true khi dữ liệu đã thật sự được ghi. Bước xem trước luôn là false. */
  committed: boolean;
  summary: Record<string, number>;
  /** row = 0 là lỗi của cả file (thiếu cột, sai định dạng...). */
  rows: { row: number; status: ImportRowStatus; message: string }[];
}

// SUPER_ADMIN không thuộc viện nào nên apiClient không tự gắn hospitalId — phải truyền viện
// đang chọn. Với Admin viện, server luôn dùng viện của chính họ và bỏ qua tham số này.
const params = (hospitalId?: number | null) => (hospitalId != null ? { hospitalId } : {});

const send = async (url: string, file: File, hospitalId?: number | null) => {
  const form = new FormData();
  form.append('file', file);
  // apiClient mặc định gửi JSON — phải ghi rõ multipart, nếu không FormData bị chuyển thành JSON.
  const res = await apiClient.post<ImportResult>(url, form, {
    params: params(hospitalId),
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const importService = {
  async downloadTemplate(type: ImportType, filename: string, hospitalId?: number | null) {
    const res = await apiClient.get<Blob>(`/import/${type}/template`, {
      params: params(hospitalId),
      responseType: 'blob',
    });
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  },

  preview: (type: ImportType, file: File, hospitalId?: number | null) =>
    send(`/import/${type}/preview`, file, hospitalId),

  importFile: (type: ImportType, file: File, hospitalId?: number | null) =>
    send(`/import/${type}`, file, hospitalId),
};
