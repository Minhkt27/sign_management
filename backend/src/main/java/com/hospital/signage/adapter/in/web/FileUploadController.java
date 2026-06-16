package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.FileUploadUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Tệp tin")
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadUseCase fileUploadUseCase;

    @Operation(summary = "Tải ảnh lên (trả về URL). type=FLOOR_MAP cho phép tối đa 20MB, mặc định 5MB.")
    @PostMapping("/upload")
    @PreAuthorize("hasAnyAuthority('ASSET_MANAGE', 'TICKET_MANAGE')")
    public ResponseEntity<UploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "ASSET") String type) {
        try {
            String url = fileUploadUseCase.upload(file, type);
            return ResponseEntity.ok(new UploadResponse(url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    public record UploadResponse(String url) {}
}
