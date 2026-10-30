package com.hospital.signage.application.service;

import java.text.Normalizer;
import java.util.function.Predicate;

/**
 * Sinh mã (code/shortCode...) tự động từ tên hiển thị, dùng chung cho các entity có
 * field mã duy nhất (Location, SignType, Hospital...) — tránh bắt người dùng tự nghĩ
 * và gõ tay một mã không trùng.
 */
public final class CodeGenerator {

    private CodeGenerator() {
    }

    /** Bỏ dấu tiếng Việt, chỉ giữ chữ+số, nối bằng "_", viết hoa. */
    public static String normalizeToSegment(String name, String fallback) {
        if (name == null || name.isBlank()) return fallback;
        String nfd = Normalizer.normalize(name, Normalizer.Form.NFD);
        String ascii = nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("đ", "d").replaceAll("Đ", "D");
        String segment = ascii.trim().toUpperCase()
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        return segment.isEmpty() ? fallback : segment;
    }

    /** Trả về base nếu chưa tồn tại, ngược lại thử base_2, base_3... tới khi tìm được mã trống. */
    public static String generateUnique(String base, Predicate<String> exists) {
        if (!exists.test(base)) return base;
        int counter = 2;
        while (exists.test(base + "_" + counter)) counter++;
        return base + "_" + counter;
    }
}
