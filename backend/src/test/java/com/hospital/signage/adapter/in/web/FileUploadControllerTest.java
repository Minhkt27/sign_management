package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.out.FileStoragePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.infrastructure.security.JwtAuthenticationFilter;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import com.hospital.signage.infrastructure.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FileUploadController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
public class FileUploadControllerTest {

    // JPEG magic bytes: FF D8 FF E0 ...
    private static final byte[] JPEG_HEADER = {
        (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
    };

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A ...
    private static final byte[] PNG_HEADER = {
        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D
    };

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FileStoragePort fileStoragePort;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDatabasePort userDatabasePort;

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void upload_withValidJpeg_returns200() throws Exception {
        when(fileStoragePort.store(anyString(), any(), anyLong(), anyString()))
                .thenReturn("http://minio/bucket/file.jpg");

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", JPEG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void upload_withValidPng_returns200() throws Exception {
        when(fileStoragePort.store(anyString(), any(), anyLong(), anyString()))
                .thenReturn("http://minio/bucket/file.png");

        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", PNG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void upload_withEmptyFile_returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void upload_withInvalidExtension_returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.exe", "application/octet-stream", JPEG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void upload_withWrongMagicBytes_returns400() throws Exception {
        // .jpg extension but content is plain text, not a real JPEG
        byte[] fakeContent = "not an image at all".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.jpg", "image/jpeg", fakeContent);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = {"TECHNICAL"})
    void upload_withTechnicianRole_returns200() throws Exception {
        when(fileStoragePort.store(anyString(), any(), anyLong(), anyString()))
                .thenReturn("http://localhost:9000/signage-assets/test.jpg");
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", JPEG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isOk());
    }
}
