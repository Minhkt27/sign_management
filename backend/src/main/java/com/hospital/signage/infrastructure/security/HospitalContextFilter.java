package com.hospital.signage.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Xác định bệnh viện của request rồi đặt vào {@link HospitalContext} để RLS dùng.
 *
 * <p>Chạy sau {@link JwtAuthenticationFilter} (đã đăng ký trong chuỗi filter của Spring
 * Security) nên tại đây SecurityContext đã có sẵn người dùng nếu họ đăng nhập.
 *
 * <p>Quy tắc phải khớp đúng với {@link SecurityUtils#resolveHospitalId(Long)} mà tầng
 * controller dùng — hai bên lệch nhau thì hoặc dữ liệu biến mất khỏi giao diện (RLS chặt
 * hơn app), hoặc RLS không còn che được gì (app chặt hơn RLS).
 */
@Slf4j
@Order(HospitalContextFilter.ORDER)
@Component
public class HospitalContextFilter extends OncePerRequestFilter {

    // Sau chuỗi filter của Spring Security (mặc định order -100) để đọc được SecurityContext.
    static final int ORDER = 0;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String previous = HospitalContext.current();
        try {
            applyContext(request);
            filterChain.doFilter(request, response);
        } finally {
            // Trả context về đúng trạng thái trước request. Trong ứng dụng thật giá trị trước
            // luôn là null nên đây chính là "dọn sạch" — bắt buộc, vì luồng được tái sử dụng
            // cho request sau và để sót giá trị là rò rỉ dữ liệu chéo viện. Khôi phục thay vì
            // xoá cứng để không phá context bao ngoài, ví dụ integration test gọi MockMvc xen
            // kẽ với truy vấn repository trực tiếp.
            if (previous == null) {
                HospitalContext.clear();
            } else {
                HospitalContext.setRaw(previous);
            }
        }
    }

    private void applyContext(HttpServletRequest request) {
        if (SecurityUtils.isAuthenticated()) {
            if (SecurityUtils.isSuperAdmin()) {
                // SUPER_ADMIN không thuộc viện nào; phạm vi thao tác do tham số hospitalId của
                // từng endpoint quyết định, nên ở tầng RLS phải mở hết.
                HospitalContext.setSystem();
                return;
            }
            Long hospitalId = SecurityUtils.getCurrentHospitalId();
            HospitalContext.set(hospitalId != null ? hospitalId : SecurityUtils.DEFAULT_HOSPITAL_ID);
            return;
        }

        // Khách chưa đăng nhập (quét QR, tra đường): bệnh viện lấy từ query param do client
        // gửi lên, mặc định về viện 1 — giống hệt SecurityUtils.resolveHospitalId().
        HospitalContext.set(parseHospitalId(request.getParameter("hospitalId")));
    }

    private Long parseHospitalId(String raw) {
        if (raw == null || raw.isBlank()) {
            return SecurityUtils.DEFAULT_HOSPITAL_ID;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            log.debug("hospitalId không hợp lệ trên request: {}", raw);
            return SecurityUtils.DEFAULT_HOSPITAL_ID;
        }
    }
}
