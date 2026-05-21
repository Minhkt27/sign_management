package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.out.FileStoragePort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStoragePort fileStoragePort;

    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            String original = file.getOriginalFilename();
            String extension = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf("."))
                    : "";
            String filename = UUID.randomUUID() + extension;
            String contentType = file.getContentType() != null
                    ? file.getContentType()
                    : "application/octet-stream";

            String url = fileStoragePort.store(filename, file.getInputStream(), file.getSize(), contentType);
            return ResponseEntity.ok(new UploadResponse(url));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    public record UploadResponse(String url) {}
}
