package com.hospital.signage.application.service;

import com.hospital.signage.adapter.out.persistence.entity.AssetEntity;
import com.hospital.signage.adapter.out.persistence.entity.MaintenanceTicketEntity;
import com.hospital.signage.adapter.out.persistence.entity.UserEntity;
import com.hospital.signage.adapter.out.persistence.repository.AssetRepository;
import com.hospital.signage.adapter.out.persistence.repository.TicketRepository;
import com.hospital.signage.adapter.out.persistence.repository.UserRepository;
import com.hospital.signage.domain.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExportService {

    private final TicketRepository ticketRepository;
    private final AssetRepository assetRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private static final Map<String, String> STATUS_LABEL = Map.of(
            "OPEN",        "Chờ xử lý",
            "IN_PROGRESS", "Đang xử lý",
            "RESOLVED",    "Chờ duyệt",
            "CLOSED",      "Đã đóng"
    );
    private static final Map<String, String> PRIORITY_LABEL = Map.of(
            "LOW",      "Thấp",
            "MEDIUM",   "Trung bình",
            "HIGH",     "Cao",
            "CRITICAL", "Khẩn cấp"
    );
    private static final Map<String, String> ASSET_STATUS_LABEL = Map.of(
            "ACTIVE",    "Hoạt động",
            "DAMAGED",   "Hỏng hóc",
            "REPAIRING", "Đang sửa chữa",
            "SCRAPPED",  "Đã thanh lý"
    );

    // ── Tickets ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] exportTickets(TicketStatus status, Long assigneeId) throws IOException {
        List<MaintenanceTicketEntity> tickets = ticketRepository
                .findByFilters(assigneeId, null, status, null, Pageable.unpaged())
                .getContent();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Phiếu bảo trì");
            sheet.setDefaultColumnWidth(20);

            CellStyle headerStyle = buildHeaderStyle(wb);
            CellStyle dateStyle   = buildDateStyle(wb);

            String[] headers = {"#", "Mã biển báo", "Tên biển báo", "Vị trí",
                    "Mô tả sự cố", "Độ ưu tiên", "Trạng thái",
                    "Người báo cáo", "KTV được giao",
                    "Ngày tạo", "Ngày hoàn thành"};
            writeHeaderRow(sheet, headers, headerStyle);

            int r = 1;
            for (MaintenanceTicketEntity t : tickets) {
                Row row = sheet.createRow(r++);
                int c = 0;
                cell(row, c++).setCellValue(t.getId());
                cell(row, c++).setCellValue(t.getAsset() != null ? t.getAsset().getAssetCode() : "");
                cell(row, c++).setCellValue(t.getAsset() != null ? nvl(t.getAsset().getName()) : "");
                cell(row, c++).setCellValue(t.getAsset() != null && t.getAsset().getLocation() != null
                        ? t.getAsset().getLocation().getName() : "");
                cell(row, c++).setCellValue(nvl(t.getDescription()));
                cell(row, c++).setCellValue(PRIORITY_LABEL.getOrDefault(
                        t.getPriority() != null ? t.getPriority().name() : "", ""));
                cell(row, c++).setCellValue(STATUS_LABEL.getOrDefault(
                        t.getTicketStatus() != null ? t.getTicketStatus().name() : "", ""));
                cell(row, c++).setCellValue(t.getReporter() != null ? t.getReporter().getFullName() : "");
                cell(row, c++).setCellValue(t.getAssignee() != null ? t.getAssignee().getFullName() : "Chưa giao");
                Cell dateCell = cell(row, c++);
                dateCell.setCellValue(formatInstant(t.getCreatedAt()));
                dateCell.setCellStyle(dateStyle);
                Cell doneCell = cell(row, c);
                doneCell.setCellValue(t.getCompletedAt() != null ? formatInstant(t.getCompletedAt()) : "");
                doneCell.setCellStyle(dateStyle);
            }

            sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));
            autoSizeColumns(sheet, headers.length);
            return toBytes(wb);
        }
    }

    // ── Assets ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] exportAssets(String search) throws IOException {
        List<AssetEntity> assets = search != null && !search.isBlank()
                ? assetRepository.search(search, Pageable.unpaged()).getContent()
                : assetRepository.findAll();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Danh sách biển báo");
            sheet.setDefaultColumnWidth(20);

            CellStyle headerStyle = buildHeaderStyle(wb);
            CellStyle dateStyle   = buildDateStyle(wb);

            String[] headers = {"Mã biển báo", "Tên biển báo", "Vị trí", "Loại biển",
                    "Chất liệu", "Kích thước", "Trạng thái",
                    "Nhà cung cấp", "Ngày lắp đặt", "Ngày tạo hồ sơ"};
            writeHeaderRow(sheet, headers, headerStyle);

            int r = 1;
            for (AssetEntity a : assets) {
                Row row = sheet.createRow(r++);
                int c = 0;
                cell(row, c++).setCellValue(nvl(a.getAssetCode()));
                cell(row, c++).setCellValue(nvl(a.getName()));
                cell(row, c++).setCellValue(a.getLocation() != null ? a.getLocation().getName() : "");
                cell(row, c++).setCellValue("");   // sign type name — not eagerly loaded, skip
                cell(row, c++).setCellValue(a.getMaterial() != null ? a.getMaterial().name() : "");
                cell(row, c++).setCellValue(nvl(a.getSize()));
                cell(row, c++).setCellValue(ASSET_STATUS_LABEL.getOrDefault(
                        a.getStatus() != null ? a.getStatus().name() : "", ""));
                cell(row, c++).setCellValue(nvl(a.getSupplier()));
                cell(row, c++).setCellValue(a.getInstalledAt() != null ? formatInstant(a.getInstalledAt()) : "");
                Cell dateCell = cell(row, c);
                dateCell.setCellValue(formatInstant(a.getCreatedAt()));
                dateCell.setCellStyle(dateStyle);
            }

            sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));
            autoSizeColumns(sheet, headers.length);
            return toBytes(wb);
        }
    }

    // ── Users ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] exportUsers() throws IOException {
        List<UserEntity> users = userRepository.findAll();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Danh sách người dùng");
            sheet.setDefaultColumnWidth(20);

            CellStyle headerStyle = buildHeaderStyle(wb);

            String[] headers = {"Tên đăng nhập", "Họ tên", "Mã vai trò", "Trạng thái"};
            writeHeaderRow(sheet, headers, headerStyle);

            int r = 1;
            for (UserEntity u : users) {
                Row row = sheet.createRow(r++);
                int c = 0;
                cell(row, c++).setCellValue(nvl(u.getUsername()));
                cell(row, c++).setCellValue(nvl(u.getFullName()));
                cell(row, c++).setCellValue(u.getRoleId() != null ? u.getRoleId().toString() : "");
                cell(row, c).setCellValue(Boolean.TRUE.equals(u.getIsActive()) ? "Hoạt động" : "Vô hiệu");
            }

            autoSizeColumns(sheet, headers.length);
            return toBytes(wb);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void writeHeaderRow(Sheet sheet, String[] headers, CellStyle style) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(style);
        }
    }

    private CellStyle buildHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        return style;
    }

    private CellStyle buildDateStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setWrapText(false);
        return style;
    }

    private void autoSizeColumns(Sheet sheet, int count) {
        for (int i = 0; i < count; i++) {
            sheet.autoSizeColumn(i);
            int w = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, Math.min(w + 512, 15000));
        }
    }

    private Cell cell(Row row, int col) {
        return row.createCell(col);
    }

    private String nvl(String s) {
        return s != null ? s : "";
    }

    private String formatInstant(Instant instant) {
        return instant != null ? FMT.format(instant) : "";
    }

    private byte[] toBytes(XSSFWorkbook wb) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        return out.toByteArray();
    }
}
