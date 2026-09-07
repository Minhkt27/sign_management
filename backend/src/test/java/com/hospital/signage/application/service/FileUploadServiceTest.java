package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.FileStoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FileUploadServiceTest {

    private static final byte[] JPEG = {
        (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
    };
    private static final byte[] PNG = {
        (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
    };
    private static final byte[] SVG =
        "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"
            .getBytes(StandardCharsets.UTF_8);

    private FileStoragePort fileStoragePort;
    private FileUploadService service;

    @BeforeEach
    void setUp() {
        fileStoragePort = mock(FileStoragePort.class);
        service = new FileUploadService(fileStoragePort);
        when(fileStoragePort.store(anyString(), any(), anyLong(), anyString()))
                .thenReturn("http://minio/signage-assets/stored.jpg");
    }

    @Test
    void upload_withValidJpeg_storesWithDetectedMime() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", JPEG);

        String url = service.upload(file, "ASSET");

        assertThat(url).isEqualTo("http://minio/signage-assets/stored.jpg");
        verify(fileStoragePort).store(anyString(), any(), anyLong(), eq("image/jpeg"));
    }

    @Test
    void upload_withSvgExtension_isRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "logo.svg", "image/svg+xml", SVG);

        assertThatThrownBy(() -> service.upload(file, "ASSET"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Định dạng file không được phép");

        verify(fileStoragePort, never()).store(anyString(), any(), anyLong(), anyString());
    }

    // Đây là đường vòng nguy hiểm nhất: đuôi nằm trong whitelist nhưng ruột là SVG.
    // Trước khi vá, file này được lưu với Content-Type image/svg+xml và chạy được script.
    @Test
    void upload_withSvgContentDisguisedAsPng_isRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "innocent.png", "image/png", SVG);

        assertThatThrownBy(() -> service.upload(file, "ASSET"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Nội dung file không hợp lệ");

        verify(fileStoragePort, never()).store(anyString(), any(), anyLong(), anyString());
    }

    @Test
    void upload_whenExtensionDoesNotMatchRealContent_isRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", JPEG);

        assertThatThrownBy(() -> service.upload(file, "ASSET"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không khớp với nội dung thật");

        verify(fileStoragePort, never()).store(anyString(), any(), anyLong(), anyString());
    }

    @Test
    void upload_withPngUnderFloorMapLimit_isAccepted() {
        MockMultipartFile file = new MockMultipartFile("file", "floor.png", "image/png", PNG);

        service.upload(file, "FLOOR_MAP");

        verify(fileStoragePort).store(anyString(), any(), anyLong(), eq("image/png"));
    }

    @Test
    void upload_withEmptyFile_isRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> service.upload(file, "ASSET"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không được rỗng");
    }

    @Test
    void upload_whenAssetExceeds5MB_isRejected() {
        byte[] tooBig = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(JPEG, 0, tooBig, 0, JPEG.length);
        MockMultipartFile file = new MockMultipartFile("file", "big.jpg", "image/jpeg", tooBig);

        assertThatThrownBy(() -> service.upload(file, "ASSET"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5MB");
    }
}
