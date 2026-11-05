package com.hospital.signage.application.service.imports;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Đọc sheet đầu tiên của file .xlsx thành các {@link ImportRow}. Dòng đầu là tiêu đề; cột
 * nhận theo TÊN tiêu đề nên người dùng thêm/bớt/đổi thứ tự cột không làm lệch dữ liệu.
 * Dòng trống hoàn toàn bị bỏ qua.
 */
final class ExcelTable {

    record Result(List<ImportRow> rows, List<String> missingRequiredHeaders, int dataRowCount) {
    }

    private ExcelTable() {
    }

    static Result read(InputStream in, List<ImportColumn> columns, int maxRows) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();

            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            Map<Integer, String> headerByIndex = new HashMap<>();
            if (headerRow != null) {
                for (Cell cell : headerRow) {
                    String header = ImportText.normalizeHeader(formatter.formatCellValue(cell, evaluator));
                    if (!header.isEmpty()) headerByIndex.put(cell.getColumnIndex(), header);
                }
            }

            List<String> missing = new ArrayList<>();
            for (ImportColumn column : columns) {
                if (column.required() && !headerByIndex.containsValue(ImportText.normalizeHeader(column.header()))) {
                    missing.add(column.header());
                }
            }

            List<ImportRow> rows = new ArrayList<>();
            int dataRows = 0;
            int first = headerRow == null ? 0 : headerRow.getRowNum() + 1;
            for (int r = first; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                Map<String, String> values = new LinkedHashMap<>();
                boolean any = false;
                for (Map.Entry<Integer, String> h : headerByIndex.entrySet()) {
                    String value = cellText(row.getCell(h.getKey()), formatter, evaluator);
                    if (!value.isBlank()) any = true;
                    values.put(h.getValue(), value);
                }
                if (!any) continue;
                dataRows++;
                // Vẫn đếm tiếp để báo đúng tổng số dòng, nhưng không giữ quá giới hạn trong bộ nhớ.
                if (rows.size() < maxRows) rows.add(new ImportRow(r + 1, values));
            }
            return new Result(rows, missing, dataRows);
        }
    }

    /** Ô kiểu ngày của Excel đổi thành yyyy-MM-dd để không phụ thuộc định dạng hiển thị trên máy người dùng. */
    private static String cellText(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null) return "";
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        if (type == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
        }
        return formatter.formatCellValue(cell, evaluator);
    }
}
