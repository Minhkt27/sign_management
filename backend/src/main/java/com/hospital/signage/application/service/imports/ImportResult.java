package com.hospital.signage.application.service.imports;

import java.util.List;
import java.util.Map;

/**
 * Kết quả xem trước hoặc nhập.
 *
 * @param committed true khi dữ liệu đã thật sự được ghi; luôn false ở bước xem trước và khi
 *                  còn dòng lỗi (quy tắc: còn lỗi thì không ghi dòng nào)
 * @param summary   số lượng theo nhóm, ví dụ "Phòng tạo mới" → 28
 * @param rows      kết quả từng dòng, theo thứ tự trong file
 */
public record ImportResult(String type, Long hospitalId, int totalRows, int errorCount, boolean committed,
                           Map<String, Integer> summary, List<RowOutcome> rows) {

    public enum Status { CREATE, SKIP, ERROR }

    public record RowOutcome(int row, Status status, String message) {
    }
}
