package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.service.ExportService;
import com.hospital.signage.domain.enums.TicketStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;

@Tag(name = "Xuất báo cáo")
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    @Operation(summary = "Xuất danh sách phiếu bảo trì ra Excel")
    @GetMapping("/tickets")
    @PreAuthorize("hasAnyAuthority('TICKET_VIEW', 'TICKET_MANAGE')")
    public ResponseEntity<byte[]> exportTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Long assigneeId) throws IOException {

        byte[] bytes = exportService.exportTickets(status, assigneeId);
        String filename = "phieu-bao-tri-" + LocalDate.now() + ".xlsx";
        return buildResponse(bytes, filename);
    }

    @Operation(summary = "Xuất danh sách biển báo ra Excel")
    @GetMapping("/assets")
    @PreAuthorize("hasAnyAuthority('ASSET_VIEW', 'ASSET_MANAGE')")
    public ResponseEntity<byte[]> exportAssets(
            @RequestParam(required = false, defaultValue = "") String search) throws IOException {

        byte[] bytes = exportService.exportAssets(search);
        String filename = "bien-bao-" + LocalDate.now() + ".xlsx";
        return buildResponse(bytes, filename);
    }

    @Operation(summary = "Xuất danh sách người dùng ra Excel")
    @GetMapping("/users")
    @PreAuthorize("hasAuthority('USER_VIEW')")
    public ResponseEntity<byte[]> exportUsers() throws IOException {
        byte[] bytes = exportService.exportUsers();
        String filename = "nguoi-dung-" + LocalDate.now() + ".xlsx";
        return buildResponse(bytes, filename);
    }

    private ResponseEntity<byte[]> buildResponse(byte[] bytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(XLSX);
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(bytes.length);
        return ResponseEntity.ok().headers(headers).body(bytes);
    }
}
