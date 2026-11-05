package com.hospital.signage.application.service.imports;

import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Sinh file mẫu từ danh sách cột: sheet dữ liệu (chỉ có tiêu đề) + sheet hướng dẫn có ví dụ.
 * Ví dụ cố ý KHÔNG đặt trong sheet dữ liệu — người dùng quên xoá thì dòng ví dụ sẽ bị nhập
 * thành dữ liệu thật.
 */
final class ExcelTemplate {

    private static final String LIST_SHEET = "_danh_sach";

    private ExcelTemplate() {
    }

    static byte[] build(String title, List<ImportColumn> columns, int maxRows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = headerStyle(wb, IndexedColors.LIGHT_CORNFLOWER_BLUE);
            CellStyle requiredStyle = headerStyle(wb, IndexedColors.LIGHT_ORANGE);

            Sheet data = wb.createSheet(safeSheetName(title));
            Sheet lists = wb.createSheet(LIST_SHEET);
            Row header = data.createRow(0);
            DataValidationHelper dv = data.getDataValidationHelper();
            int listColumn = 0;
            for (int i = 0; i < columns.size(); i++) {
                ImportColumn c = columns.get(i);
                var cell = header.createCell(i);
                cell.setCellValue(c.required() ? c.header() + " *" : c.header());
                cell.setCellStyle(c.required() ? requiredStyle : headerStyle);
                data.setColumnWidth(i, Math.max(c.width(), c.header().length() + 4) * 256);

                if (!c.allowedValues().isEmpty()) {
                    // Danh sách để ở sheet ẩn thay vì nhúng thẳng vào ô kiểm tra: Excel giới hạn
                    // danh sách nhúng 255 ký tự, không đủ khi viện có nhiều loại biển.
                    for (int v = 0; v < c.allowedValues().size(); v++) {
                        Row r = lists.getRow(v) != null ? lists.getRow(v) : lists.createRow(v);
                        r.createCell(listColumn).setCellValue(c.allowedValues().get(v));
                    }
                    String col = CellReference.convertNumToColString(listColumn);
                    Name name = wb.createName();
                    name.setNameName("ds_" + listColumn);
                    name.setRefersToFormula("'" + LIST_SHEET + "'!$" + col + "$1:$" + col + "$" + c.allowedValues().size());
                    DataValidationConstraint constraint = dv.createFormulaListConstraint("ds_" + listColumn);
                    DataValidation validation = dv.createValidation(constraint, new CellRangeAddressList(1, maxRows, i, i));
                    validation.setShowErrorBox(true);
                    validation.createErrorBox("Giá trị không hợp lệ", "Chọn một giá trị trong danh sách.");
                    data.addValidationData(validation);
                    listColumn++;
                }
            }
            data.createFreezePane(0, 1);
            wb.setSheetHidden(wb.getSheetIndex(lists), true);

            Sheet guide = wb.createSheet("Hướng dẫn");
            Row g0 = guide.createRow(0);
            String[] guideHeaders = {"Cột", "Bắt buộc", "Ví dụ", "Ghi chú"};
            for (int i = 0; i < guideHeaders.length; i++) {
                var cell = g0.createCell(i);
                cell.setCellValue(guideHeaders[i]);
                cell.setCellStyle(headerStyle);
            }
            for (int i = 0; i < columns.size(); i++) {
                ImportColumn c = columns.get(i);
                Row r = guide.createRow(i + 1);
                r.createCell(0).setCellValue(c.header());
                r.createCell(1).setCellValue(c.required() ? "Có" : "");
                r.createCell(2).setCellValue(c.example() == null ? "" : c.example());
                String note = c.note() == null ? "" : c.note();
                if (!c.allowedValues().isEmpty()) {
                    note = (note.isEmpty() ? "" : note + " ") + "Chọn trong danh sách thả xuống.";
                }
                r.createCell(3).setCellValue(note);
            }
            Row tip = guide.createRow(columns.size() + 2);
            tip.createCell(0).setCellValue("Điền dữ liệu ở sheet \"" + data.getSheetName()
                    + "\", mỗi dòng một mục, tối đa " + maxRows + " dòng. Cột có dấu * là bắt buộc. "
                    + "Nếu còn dòng lỗi, hệ thống không ghi dòng nào.");
            guide.setColumnWidth(0, 22 * 256);
            guide.setColumnWidth(1, 10 * 256);
            guide.setColumnWidth(2, 28 * 256);
            guide.setColumnWidth(3, 70 * 256);

            wb.setActiveSheet(0);
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static CellStyle headerStyle(XSSFWorkbook wb, IndexedColors color) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(color.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private static String safeSheetName(String title) {
        String cleaned = title.replaceAll("[\\\\/?*\\[\\]:]", " ");
        return cleaned.length() > 31 ? cleaned.substring(0, 31) : cleaned;
    }
}
