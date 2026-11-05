package com.hospital.signage.application.service.imports;

import java.util.List;

/**
 * Một cột trong file nhập. Mô tả đủ để vừa đọc file, vừa sinh file mẫu (tiêu đề, độ rộng,
 * danh sách thả xuống) — mỗi loại nhập chỉ cần khai báo cột, không phải tự xử lý Excel.
 *
 * @param allowedValues giá trị cho danh sách thả xuống trong file mẫu; rỗng = gõ tự do
 */
public record ImportColumn(String header, boolean required, String example, String note,
                           List<String> allowedValues, int width) {

    public static ImportColumn required(String header, String example, String note) {
        return new ImportColumn(header, true, example, note, List.of(), 22);
    }

    public static ImportColumn optional(String header, String example, String note) {
        return new ImportColumn(header, false, example, note, List.of(), 22);
    }

    public ImportColumn withAllowedValues(List<String> values) {
        return new ImportColumn(header, required, example, note, List.copyOf(values), width);
    }
}
