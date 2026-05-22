package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.out.FileStoragePort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    private final FileStoragePort fileStoragePort;

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICAL')")
    public ResponseEntity<UploadResponse> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            return ResponseEntity.badRequest().build();
        }

        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.badRequest().build();
        }

        try {
            byte[] header = file.getInputStream().readNBytes(12);
            String detectedMime = detectImageMime(header);
            if (detectedMime == null) {
                return ResponseEntity.badRequest().build();
            }

            String filename = UUID.randomUUID() + "." + ext;
            String url = fileStoragePort.store(filename, file.getInputStream(), file.getSize(), detectedMime);
            return ResponseEntity.ok(new UploadResponse(url));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private static String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    // Validates actual content via magic bytes — ignores client-supplied Content-Type
    private static String detectImageMime(byte[] h) {
        if (h.length >= 3
                && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF)
            return "image/jpeg";
        if (h.length >= 4
                && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G')
            return "image/png";
        if (h.length >= 4
                && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8')
            return "image/gif";
        if (h.length >= 12
                && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P')
            return "image/webp";
        return null;
    }

    public record UploadResponse(String url) {}
}
