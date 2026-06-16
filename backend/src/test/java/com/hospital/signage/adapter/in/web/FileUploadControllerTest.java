package com.hospital.signage.adapter.in.web;

import com.hospital.signage.application.port.in.FileUploadUseCase;
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
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FileUploadController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
public class FileUploadControllerTest {

    private static final byte[] JPEG_HEADER = {
        (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
    };

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FileUploadUseCase fileUploadUseCase;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDatabasePort userDatabasePort;

    @Test
    @WithMockUser(authorities = {"ASSET_MANAGE"})
    void upload_withValidFile_returns200() throws Exception {
        when(fileUploadUseCase.upload(any(), any())).thenReturn("http://minio/bucket/file.jpg");

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", JPEG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = {"ASSET_MANAGE"})
    void upload_whenUseCaseThrowsIllegalArgument_returns400() throws Exception {
        when(fileUploadUseCase.upload(any(), any())).thenThrow(new IllegalArgumentException("invalid"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", JPEG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(authorities = {"ASSET_MANAGE"})
    void upload_whenUseCaseThrowsRuntimeException_returns500() throws Exception {
        when(fileUploadUseCase.upload(any(), any())).thenThrow(new RuntimeException("storage error"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", JPEG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser(authorities = {"ASSET_MANAGE"})
    void upload_withTechnicianRole_returns200() throws Exception {
        when(fileUploadUseCase.upload(any(), any())).thenReturn("http://localhost:9000/signage-assets/test.jpg");

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", JPEG_HEADER);

        mockMvc.perform(multipart("/api/files/upload").file(file).with(csrf()))
                .andExpect(status().isOk());
    }

}
