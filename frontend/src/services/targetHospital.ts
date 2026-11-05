import { authStore, isSuperAdmin } from '@/app/store/authStore';

/** Khoá localStorage nơi ô chọn viện (AdminLayout) lưu viện SUPER_ADMIN đang chọn. */
export const ADMIN_SELECTED_HOSPITAL_KEY = 'admin_selected_hospital';

/**
 * Tham số viện đích cho các lệnh TẠO mới. SUPER_ADMIN không thuộc viện nào nên apiClient
 * không tự gắn hospitalId — phải gửi viện đang chọn, nếu không server từ chối (trước đây
 * dữ liệu âm thầm rơi vào viện mặc định). Admin viện: không gửi gì, server dùng viện của họ.
 */
export const targetHospitalParams = (): { hospitalId?: number } => {
  if (!isSuperAdmin(authStore.getToken())) return {};
  const id = Number(localStorage.getItem(ADMIN_SELECTED_HOSPITAL_KEY));
  return id ? { hospitalId: id } : {};
};
