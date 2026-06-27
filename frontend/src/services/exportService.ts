import { authStore } from '@/app/store/authStore';

const BASE = '/api/export';

async function downloadExcel(url: string, filename: string): Promise<void> {
  const token = authStore.getToken();
  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'ngrok-skip-browser-warning': 'true',
    },
  });
  if (!res.ok) throw new Error(`Export thất bại: ${res.status}`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export const exportService = {
  exportTickets(params?: { status?: string; assigneeId?: number }) {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.assigneeId) q.set('assigneeId', String(params.assigneeId));
    const qs = q.toString() ? `?${q}` : '';
    const date = new Date().toISOString().slice(0, 10);
    return downloadExcel(`${BASE}/tickets${qs}`, `phieu-bao-tri-${date}.xlsx`);
  },

  exportAssets(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const date = new Date().toISOString().slice(0, 10);
    return downloadExcel(`${BASE}/assets${q}`, `bien-bao-${date}.xlsx`);
  },

  exportUsers() {
    const date = new Date().toISOString().slice(0, 10);
    return downloadExcel(`${BASE}/users`, `nguoi-dung-${date}.xlsx`);
  },
};
