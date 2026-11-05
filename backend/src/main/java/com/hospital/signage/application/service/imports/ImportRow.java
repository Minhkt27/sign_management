package com.hospital.signage.application.service.imports;

import java.util.Map;

/** Một dòng dữ liệu đã đọc từ file. rowNumber là số dòng đúng như người dùng thấy trong Excel. */
public record ImportRow(int rowNumber, Map<String, String> values) {

    /** Giá trị đã cắt khoảng trắng; null nếu ô trống hoặc file không có cột này. */
    public String get(String header) {
        String value = values.get(ImportText.normalizeHeader(header));
        if (value == null) return null;
        String trimmed = ImportText.collapseSpaces(value);
        return trimmed.isEmpty() ? null : trimmed;
    }
}
