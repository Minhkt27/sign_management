package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.out.HospitalDatabasePort;
import com.hospital.signage.application.service.imports.ExcelImportService;
import com.hospital.signage.application.service.imports.ImportResult;
import com.hospital.signage.infrastructure.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Nhập dữ liệu từ Excel, dùng chung cho mọi loại ({type} = locations, assets...).
 * Quy trình: tải file mẫu → xem trước → nhập. Bước nhập kiểm tra lại toàn bộ file từ đầu
 * (không tin kết quả xem trước cũ), và còn dòng lỗi thì không ghi dòng nào.
 */
@Tag(name = "Nhập dữ liệu từ Excel")
@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ExcelImportService importService;
    private final HospitalDatabasePort hospitalDatabasePort;

    @Operation(summary = "Tải file mẫu")
    @GetMapping("/{type}/template")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> template(@PathVariable String type,
                                           @RequestParam(required = false) Long hospitalId) throws IOException {
        Long target = resolveTarget(type, hospitalId);
        byte[] bytes = importService.template(type, target);
        String filename = "mau-nhap-" + type + ".xlsx";
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
                .body(bytes);
    }

    @Operation(summary = "Xem trước kết quả nhập (không ghi gì)")
    @PostMapping(value = "/{type}/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ImportResult> preview(@PathVariable String type,
                                                @RequestPart("file") MultipartFile file,
                                                @RequestParam(required = false) Long hospitalId) throws IOException {
        Long target = resolveTarget(type, hospitalId);
        return ResponseEntity.ok(importService.preview(type, file.getBytes(), target));
    }

    @Operation(summary = "Nhập dữ liệu (còn dòng lỗi thì không ghi dòng nào)")
    @PostMapping(value = "/{type}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ImportResult> importFile(@PathVariable String type,
                                                   @RequestPart("file") MultipartFile file,
                                                   @RequestParam(required = false) Long hospitalId) throws IOException {
        Long target = resolveTarget(type, hospitalId);
        return ResponseEntity.ok(importService.importFile(type, file.getBytes(), target));
    }

    /**
     * Kiểm quyền theo loại nhập và chốt viện đích. Admin viện luôn nhập vào viện của chính
     * mình (bỏ qua hospitalId client gửi). Quản trị hệ thống không thuộc viện nào nên PHẢI
     * chỉ rõ viện — không mặc định về viện 1, tránh nhập nhầm cả file vào viện khác.
     */
    private Long resolveTarget(String type, Long requestedHospitalId) {
        String authority = importService.handler(type).requiredAuthority();
        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean allowed = auth != null && auth.getAuthorities().stream().anyMatch(a -> authority.equals(a.getAuthority()));
        if (!allowed) {
            throw new AccessDeniedException("Bạn không có quyền nhập loại dữ liệu này.");
        }
        Long target = SecurityUtils.requireTargetHospitalId(requestedHospitalId);
        hospitalDatabasePort.findById(target)
                .orElseThrow(() -> new IllegalArgumentException("Bệnh viện không tồn tại."));
        return target;
    }
}
