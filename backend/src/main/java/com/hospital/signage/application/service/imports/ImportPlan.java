package com.hospital.signage.application.service.imports;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Kế hoạch nhập dựng hoàn toàn trong bộ nhớ, chưa ghi gì xuống DB. Xem trước = dựng kế hoạch
 * rồi trả về; nhập thật = dựng lại đúng kế hoạch đó rồi gọi {@link #apply()} trong một giao
 * dịch. Vì cùng một đoạn code quyết định cả hai, những gì người dùng thấy ở bước xem trước
 * chính là những gì sẽ được ghi.
 */
public final class ImportPlan {

    /** Việc ghi thật sự, chỉ chạy khi không còn dòng lỗi nào. */
    @FunctionalInterface
    public interface Writer {
        void write();
    }

    private final List<ImportResult.RowOutcome> rows = new ArrayList<>();
    private final Map<String, Integer> summary = new LinkedHashMap<>();
    private final List<Writer> writers = new ArrayList<>();
    private int errorCount;

    public void create(int row, String message) {
        rows.add(new ImportResult.RowOutcome(row, ImportResult.Status.CREATE, message));
    }

    public void skip(int row, String message) {
        rows.add(new ImportResult.RowOutcome(row, ImportResult.Status.SKIP, message));
    }

    public void error(int row, String message) {
        rows.add(new ImportResult.RowOutcome(row, ImportResult.Status.ERROR, message));
        errorCount++;
    }

    /** Lỗi của cả file (thiếu cột bắt buộc, quá nhiều dòng...) — ghi vào dòng 0. */
    public void fileError(String message) {
        error(0, message);
    }

    public void count(String label) {
        summary.merge(label, 1, Integer::sum);
    }

    public void addWriter(Writer writer) {
        writers.add(writer);
    }

    public boolean hasErrors() {
        return errorCount > 0;
    }

    void apply() {
        writers.forEach(Writer::write);
    }

    ImportResult toResult(String type, Long hospitalId, int totalRows, boolean committed) {
        return new ImportResult(type, hospitalId, totalRows, errorCount, committed, Map.copyOf(summary),
                List.copyOf(rows));
    }

    Map<String, Integer> summaryView() {
        return summary;
    }
}
