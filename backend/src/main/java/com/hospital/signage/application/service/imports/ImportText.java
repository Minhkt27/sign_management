package com.hospital.signage.application.service.imports;

import java.util.Locale;

/** Chuẩn hoá chữ để so khớp tên khi nhập: bỏ khoảng trắng thừa, không phân biệt hoa/thường. */
public final class ImportText {

    private static final Locale VI = Locale.forLanguageTag("vi");

    private ImportText() {
    }

    public static String collapseSpaces(String s) {
        return s == null ? "" : s.replace(' ', ' ').trim().replaceAll("\s+", " ");
    }

    /** Khoá so khớp tên: "  Phòng  101 " và "phòng 101" là cùng một phòng. Giữ dấu tiếng Việt. */
    public static String key(String s) {
        return collapseSpaces(s).toLowerCase(VI);
    }

    /** Tiêu đề cột so khớp không phân biệt hoa/thường, khoảng trắng và dấu "*" đánh dấu bắt buộc. */
    public static String normalizeHeader(String s) {
        return key(s == null ? "" : s.replace("*", ""));
    }
}
