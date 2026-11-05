package com.hospital.signage.application.service.imports;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Điều phối chung cho mọi loại nhập Excel: đọc file → dựng kế hoạch → (nếu nhập thật và
 * không còn lỗi) ghi toàn bộ trong MỘT giao dịch.
 *
 * <p>Quy tắc cố định: còn bất kỳ dòng lỗi nào thì không ghi dòng nào. Ghi tới giữa chừng mà
 * hỏng (lỗi DB...) thì giao dịch quay lui, cũng không còn dòng nào được ghi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelImportService {

    public static final int MAX_ROWS = 2000;
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    private final List<ImportHandler> handlers;
    private final PlatformTransactionManager transactionManager;

    public ImportHandler handler(String type) {
        return handlers.stream().filter(h -> h.type().equals(type)).findFirst()
                .orElseThrow(() -> new NoSuchElementException("Không hỗ trợ nhập loại dữ liệu: " + type));
    }

    public byte[] template(String type, Long hospitalId) throws IOException {
        ImportHandler h = handler(type);
        return ExcelTemplate.build(h.title(), h.columns(hospitalId), MAX_ROWS);
    }

    public ImportResult preview(String type, byte[] file, Long hospitalId) {
        return run(type, file, hospitalId, false);
    }

    public ImportResult importFile(String type, byte[] file, Long hospitalId) {
        return run(type, file, hospitalId, true);
    }

    private ImportResult run(String type, byte[] file, Long hospitalId, boolean commit) {
        ImportHandler h = handler(type);
        ImportPlan plan = new ImportPlan();

        if (file == null || file.length == 0) {
            plan.fileError("File trống.");
            return plan.toResult(type, hospitalId, 0, false);
        }
        if (file.length > MAX_BYTES) {
            plan.fileError("File quá lớn (tối đa " + (MAX_BYTES / 1024 / 1024) + "MB).");
            return plan.toResult(type, hospitalId, 0, false);
        }

        List<ImportColumn> columns = h.columns(hospitalId);
        ExcelTable.Result table;
        try {
            table = ExcelTable.read(new ByteArrayInputStream(file), columns, MAX_ROWS);
        } catch (Exception e) {
            log.info("Import {}: không đọc được file: {}", type, e.getMessage());
            plan.fileError("Không đọc được file. Hãy dùng file .xlsx tải từ nút \"Tải file mẫu\".");
            return plan.toResult(type, hospitalId, 0, false);
        }

        if (!table.missingRequiredHeaders().isEmpty()) {
            plan.fileError("Thiếu cột bắt buộc: " + String.join(", ", table.missingRequiredHeaders())
                    + ". Hãy dùng file mẫu và giữ nguyên dòng tiêu đề.");
            return plan.toResult(type, hospitalId, table.dataRowCount(), false);
        }
        if (table.dataRowCount() > MAX_ROWS) {
            plan.fileError("File có " + table.dataRowCount() + " dòng, vượt giới hạn " + MAX_ROWS
                    + " dòng mỗi lần nhập. Hãy chia thành nhiều file.");
            return plan.toResult(type, hospitalId, table.dataRowCount(), false);
        }
        if (table.rows().isEmpty()) {
            plan.fileError("File không có dòng dữ liệu nào.");
            return plan.toResult(type, hospitalId, 0, false);
        }

        // Dựng kế hoạch và ghi trong cùng một giao dịch, để dữ liệu dùng khi kiểm tra (vị trí,
        // biển đã có...) là cùng một bản chụp với lúc ghi.
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        boolean committed;
        try {
            committed = Boolean.TRUE.equals(tx.execute(status -> {
                h.plan(table.rows(), hospitalId, plan);
                if (!commit || plan.hasErrors()) {
                    status.setRollbackOnly();
                    return false;
                }
                plan.apply();
                return true;
            }));
        } catch (RuntimeException e) {
            log.warn("Import {} vào viện {} thất bại khi ghi, đã quay lui: {}", type, hospitalId, e.getMessage());
            ImportPlan failed = new ImportPlan();
            failed.fileError("Lỗi khi ghi dữ liệu nên không dòng nào được ghi: " + e.getMessage());
            return failed.toResult(type, hospitalId, table.dataRowCount(), false);
        }
        if (committed) {
            log.info("Import {} vào viện {}: {} dòng, {}", type, hospitalId, table.dataRowCount(), plan.summaryView());
        }
        return plan.toResult(type, hospitalId, table.dataRowCount(), committed);
    }
}
