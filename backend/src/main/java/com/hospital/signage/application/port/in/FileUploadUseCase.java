package com.hospital.signage.application.port.in;

import org.springframework.web.multipart.MultipartFile;

public interface FileUploadUseCase {
    String upload(MultipartFile file);
}
