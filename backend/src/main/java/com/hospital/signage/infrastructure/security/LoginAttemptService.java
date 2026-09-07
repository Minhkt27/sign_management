package com.hospital.signage.infrastructure.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Đếm số lần đăng nhập thất bại theo hai chiều độc lập.
 *
 * <p><b>Theo username</b> — chặn dò mật khẩu của một tài khoản cụ thể từ nhiều IP.
 * Ngưỡng thấp. Đánh đổi đã biết: kẻ xấu cố tình nhập sai có thể khoá tài khoản người khác
 * 15 phút. Vẫn giữ vì đây là phòng tuyến chính cho mật khẩu yếu, và thiệt hại chỉ là chậm
 * đăng nhập chứ không mất dữ liệu.
 *
 * <p><b>Theo IP</b> — chặn password spraying: thử một mật khẩu phổ biến trên rất nhiều tài
 * khoản khác nhau, kiểu tấn công mà đếm theo username không bao giờ thấy. Ngưỡng cao hơn
 * vì cả một bệnh viện thường đi ra internet chung một IP (NAT).
 *
 * <p>Bộ nhớ trong tiến trình: mất khi restart và không dùng chung giữa nhiều instance.
 * Đủ cho quy mô hiện tại (một instance backend); nếu scale ngang thì phải chuyển sang Redis.
 */
@Component
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS_PER_USERNAME = 5;
    private static final int MAX_ATTEMPTS_PER_IP = 20;
    private static final long LOCK_DURATION_SECONDS = 900; // 15 minutes

    // Chặn map phình vô hạn khi bị bắn liên tục bằng username/IP ngẫu nhiên: tới ngưỡng thì
    // quét dọn các bản ghi đã hết hạn.
    private static final int CLEANUP_THRESHOLD = 10_000;

    private record AttemptRecord(int count, Instant windowStart) {}

    private final ConcurrentHashMap<String, AttemptRecord> byUsername = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AttemptRecord> byIp = new ConcurrentHashMap<>();

    public void recordSuccess(String username, String clientIp) {
        byUsername.remove(normalize(username));
        // Cố tình KHÔNG xoá bộ đếm của IP: một lần đăng nhập thành công không nên xoá sạch
        // dấu vết của hàng loạt lần thất bại trước đó từ cùng IP — đó chính là hình dạng của
        // password spraying (dò trúng một tài khoản sau khi thử hỏng rất nhiều tài khoản khác).
    }

    public void recordFailure(String username, String clientIp) {
        increment(byUsername, normalize(username));
        if (clientIp != null && !clientIp.isBlank()) {
            increment(byIp, clientIp);
        }
        cleanupIfNeeded();
    }

    public boolean isBlocked(String username, String clientIp) {
        return isBlocked(byUsername, normalize(username), MAX_ATTEMPTS_PER_USERNAME)
                || (clientIp != null && isBlocked(byIp, clientIp, MAX_ATTEMPTS_PER_IP));
    }

    private void increment(Map<String, AttemptRecord> store, String key) {
        store.merge(
            key,
            new AttemptRecord(1, Instant.now()),
            (existing, fresh) -> isExpired(existing)
                ? new AttemptRecord(1, Instant.now())
                : new AttemptRecord(existing.count() + 1, existing.windowStart())
        );
    }

    private boolean isBlocked(Map<String, AttemptRecord> store, String key, int maxAttempts) {
        AttemptRecord record = store.get(key);
        if (record == null) return false;
        if (isExpired(record)) {
            store.remove(key);
            return false;
        }
        return record.count() >= maxAttempts;
    }

    private boolean isExpired(AttemptRecord record) {
        return record.windowStart().plusSeconds(LOCK_DURATION_SECONDS).isBefore(Instant.now());
    }

    private void cleanupIfNeeded() {
        if (byUsername.size() > CLEANUP_THRESHOLD) {
            byUsername.values().removeIf(this::isExpired);
        }
        if (byIp.size() > CLEANUP_THRESHOLD) {
            byIp.values().removeIf(this::isExpired);
        }
    }

    // Tên đăng nhập không phân biệt hoa thường ở bước dò: nếu không chuẩn hoá thì chỉ cần
    // đổi kiểu chữ ("Admin", "ADMIN") là có thêm 5 lượt thử cho cùng một tài khoản.
    private String normalize(String username) {
        return username == null ? "" : username.toLowerCase(java.util.Locale.ROOT);
    }
}
