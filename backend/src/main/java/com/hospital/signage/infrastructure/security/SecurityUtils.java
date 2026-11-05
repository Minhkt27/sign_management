package com.hospital.signage.infrastructure.security;

import com.hospital.signage.domain.model.User;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    public static final long DEFAULT_HOSPITAL_ID = 1L;

    private SecurityUtils() {
    }

    public static boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
    }

    /**
     * userId của user đang đăng nhập (null nếu chưa đăng nhập)
     */
    public static Long getCurrentUserId() {
        if (!isAuthenticated())
            return null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }

    /**
     * hospitalId của user đang đăng nhập (null nếu SUPER_ADMIN — không giới hạn
     * viện nào, hoặc nếu chưa đăng nhập).
     *
     * <p><b>CHỈ dùng cho endpoint đã yêu cầu đăng nhập.</b> Trên endpoint permitAll,
     * khách chưa đăng nhập cũng nhận null, mà tầng service hiểu null là "SUPER_ADMIN,
     * bỏ qua lọc viện" — nghĩa là người lạ đọc được dữ liệu của mọi bệnh viện chỉ bằng
     * cách dò ID. Endpoint public phải dùng {@link #resolveHospitalId(Long)}.
     */
    public static Long getCurrentHospitalId() {
        if (!isAuthenticated())
            return null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth.getPrincipal() instanceof User user) {
            return user.getHospitalId();
        }
        return null;
    }

    public static boolean isSuperAdmin() {
        if (!isAuthenticated())
            return false;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("HOSPITAL_MANAGE"));
    }

    public static Long resolveAdminHospitalId(Long requestedHospitalId) {
        if (isSuperAdmin()) {
            return requestedHospitalId; // SUPER_ADMIN có thể truyền hospitalId tùy ý (null = tất cả)
        }
        return getCurrentHospitalId(); // User thường luôn bị ép lấy viện của chính họ
    }

    /**
     * Viện đích khi TẠO dữ liệu mới (vị trí, biển báo, loại biển, nhập Excel...).
     * <ul>
     *   <li>User thường: luôn là viện của chính họ — bỏ qua giá trị client gửi.</li>
     *   <li>SUPER_ADMIN: không thuộc viện nào nên BẮT BUỘC chỉ rõ viện (viện đang chọn ở
     *       giao diện). Trước đây thiếu thì rơi về viện mặc định: tạo tòa nhà khi đang chọn
     *       viện B lại ra ở viện 1, còn tạo vị trí con thì báo "thuộc bệnh viện khác".</li>
     * </ul>
     */
    public static Long requireTargetHospitalId(Long requestedHospitalId) {
        if (isSuperAdmin()) {
            if (requestedHospitalId == null) {
                throw new IllegalArgumentException("Hãy chọn bệnh viện ở ô chọn viện trước khi tạo dữ liệu.");
            }
            return requestedHospitalId;
        }
        Long current = getCurrentHospitalId();
        return current != null ? current : DEFAULT_HOSPITAL_ID;
    }

    /**
     * Dùng cho endpoint permitAll dùng chung bởi cả public (QR/wayfinding) lẫn
     * admin đã đăng nhập:
     * - Đã đăng nhập: luôn lấy hospitalId từ server-side context (không tin query
     * param), null = SUPER_ADMIN thấy tất cả.
     * - Chưa đăng nhập (public): dùng query param do client truyền, mặc định về
     * viện 1 nếu thiếu.
     */
    public static Long resolveHospitalId(Long queryParamHospitalId) {
        if (isAuthenticated()) {
            return resolveAdminHospitalId(queryParamHospitalId);
        }
        return queryParamHospitalId != null ? queryParamHospitalId : DEFAULT_HOSPITAL_ID;
    }
}
