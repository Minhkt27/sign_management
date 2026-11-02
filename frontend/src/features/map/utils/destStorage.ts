import { resolveHospitalId } from '@/app/store/authStore';

// Điểm đến gần nhất được nhớ lại để lần quét QR sau tự điền sẵn. Phải lưu riêng theo
// từng viện: id điểm đến là id node trên bản đồ của một viện cụ thể, mang sang viện khác
// sẽ thành điểm đến không tồn tại và trang báo "Không tìm được đường".
const LEGACY_KEY = 'wayfinding_dest';
const key = () => `${LEGACY_KEY}:${resolveHospitalId() ?? 'none'}`;

export const savedDest = {
  get: (): string | null => {
    // Bản cũ lưu chung một khoá cho mọi viện, không biết thuộc viện nào nên bỏ đi.
    localStorage.removeItem(LEGACY_KEY);
    return localStorage.getItem(key());
  },
  set: (nodeId: number) => localStorage.setItem(key(), String(nodeId)),
  clear: () => localStorage.removeItem(key()),
};
