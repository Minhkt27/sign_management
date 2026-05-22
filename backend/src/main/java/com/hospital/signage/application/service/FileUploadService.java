package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.FileUploadUseCase;
import com.hospital.signage.application.port.out.FileStoragePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileUploadService implements FileUploadUseCase {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024;

    private final FileStoragePort fileStoragePort;

    @Override
    public String upload(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File không được rỗng");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("File vượt quá giới hạn 5MB");
        }
        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Định dạng file không được phép");
        }
        try {
            byte[] header = file.getInputStream().readNBytes(12);
            String detectedMime = detectImageMime(header);
            if (detectedMime == null) {
                throw new IllegalArgumentException("Nội dung file không hợp lệ");
            }
            String filename = UUID.randomUUID() + "." + ext;
            return fileStoragePort.store(filename, file.getInputStream(), file.getSize(), detectedMime);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi đọc file: " + e.getMessage(), e);
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
}
