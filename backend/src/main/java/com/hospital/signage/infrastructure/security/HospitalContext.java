package com.hospital.signage.infrastructure.security;

import java.util.function.Supplier;

/**
 * Bệnh viện đang được thao tác trong luồng hiện tại, dùng để nạp vào biến phiên
 * {@code app.hospital_id} mà các policy RLS đọc (xem migration V22).
 *
 * <p>Ba trạng thái, khớp đúng với thứ policy hiểu:
 * <ul>
 *   <li>một id cụ thể — chỉ thấy dữ liệu viện đó,</li>
 *   <li>{@link #SYSTEM} ("all") — thấy tất cả: SUPER_ADMIN, seed dữ liệu, tác vụ nền,</li>
 *   <li>chưa đặt — không thấy gì (fail-closed).</li>
 * </ul>
 *
 * <p>Trạng thái "chưa đặt" là mặc định có chủ ý. Một đường thực thi nào đó quên khai báo sẽ
 * cho ra màn hình trống — hỏng rõ ràng, phát hiện ngay — thay vì âm thầm trả về dữ liệu của
 * mọi bệnh viện.
 */
public final class HospitalContext {

    public static final String SYSTEM = "all";

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private HospitalContext() {
    }

    public static void set(Long hospitalId) {
        CURRENT.set(hospitalId == null ? null : String.valueOf(hospitalId));
    }

    /** Bỏ mọi giới hạn theo viện. Chỉ dùng cho SUPER_ADMIN và tác vụ hệ thống. */
    public static void setSystem() {
        CURRENT.set(SYSTEM);
    }

    /** Đặt lại đúng giá trị thô đã lấy từ {@link #current()} — dùng để khôi phục context. */
    public static void setRaw(String value) {
        CURRENT.set(value);
    }

    /** Giá trị sẽ nạp vào app.hospital_id, hoặc null nếu chưa khai báo. */
    public static String current() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }

    /**
     * Chạy một đoạn việc với quyền hệ thống rồi trả context về nguyên trạng.
     *
     * <p>Dành cho những chỗ chạy ngoài phạm vi một request và vì thế không có bệnh viện nào
     * để suy ra — điển hình là seed dữ liệu lúc khởi động.
     */
    public static <T> T runAsSystem(Supplier<T> work) {
        String previous = CURRENT.get();
        CURRENT.set(SYSTEM);
        try {
            return work.get();
        } finally {
            if (previous == null) {
                CURRENT.remove();
            } else {
                CURRENT.set(previous);
            }
        }
    }

    public static void runAsSystem(Runnable work) {
        runAsSystem(() -> {
            work.run();
            return null;
        });
    }
}
