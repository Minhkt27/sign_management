package com.hospital.signage.application.port.out;

import java.io.InputStream;

public interface FileStoragePort {
    String store(String filename, InputStream content, long size, String contentType);
    void delete(String objectName);
}
