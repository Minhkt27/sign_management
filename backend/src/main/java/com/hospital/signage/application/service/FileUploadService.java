package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.FileUploadUseCase;
import com.hospital.signage.application.port.out.FileStoragePort;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FileUploadService implements FileUploadUseCase {

    // SVG cố tình KHÔNG nằm trong danh sách: nó là XML, có thể nhúng <script>, và bucket
    // ảnh được phục vụ cùng origin với ứng dụng (nginx proxy /signage-assets/ → MinIO).
    // Một file .svg độc hại mở thẳng bằng URL sẽ chạy script trên chính domain của app và
    // đọc được token trong localStorage. Muốn hỗ trợ lại SVG thì phải sanitize trước khi lưu.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");

    // Đuôi file phải khớp với định dạng thật dò được từ magic byte. Thiếu bước này thì chỉ
    // cần đặt tên "x.png" cho một file nội dung SVG là qua được whitelist đuôi, rồi lại được
    // lưu với Content-Type image/svg+xml — trình duyệt xử theo Content-Type, không theo đuôi.
    private static final Map<String, String> EXTENSION_MIME = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "gif", "image/gif",
            "webp", "image/webp");

    private static final long MAX_SIZE_ASSET    = 5L  * 1024 * 1024;  // 5MB  — ảnh tài sản/công việc
    private static final long MAX_SIZE_FLOOR_MAP = 20L * 1024 * 1024; // 20MB — ảnh sơ đồ tầng

    private final FileStoragePort fileStoragePort;

    @Override
    @Transactional
    public String upload(MultipartFile file, String type) {
        long maxBytes = "FLOOR_MAP".equalsIgnoreCase(type) ? MAX_SIZE_FLOOR_MAP : MAX_SIZE_ASSET;
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File không được rỗng");
        }
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(
                "FLOOR_MAP".equalsIgnoreCase(type)
                    ? "File vượt quá giới hạn 20MB"
                    : "File vượt quá giới hạn 5MB"
            );
        }
        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Định dạng file không được phép");
        }
        try {
            byte[] bytes = file.getBytes();
            String detectedMime = detectImageMime(bytes);
            if (detectedMime == null) {
                throw new IllegalArgumentException("Nội dung file không hợp lệ");
            }
            if (!detectedMime.equals(EXTENSION_MIME.get(ext))) {
                throw new IllegalArgumentException("Phần mở rộng của file không khớp với nội dung thật của file");
            }
            String filename = UUID.randomUUID() + "." + ext;
            return fileStoragePort.store(filename, new java.io.ByteArrayInputStream(bytes), bytes.length, detectedMime);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi đọc file: " + e.getMessage(), e);
        }
    }

    private static String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

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
