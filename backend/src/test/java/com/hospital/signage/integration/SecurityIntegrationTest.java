package com.hospital.signage.integration;

import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@AutoConfigureMockMvc
public class SecurityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void testPublicEndpoints_ShouldReturnOk() throws Exception {
        // Mặc dù không có data map nhưng endpoint phải return 200 chứ không phải 401
        mockMvc.perform(get("/api/map/floors"))
                .andExpect(status().isOk());
    }

    @Test
    void testProtectedEndpoints_WithoutToken_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/assets"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testInvalidToken_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/assets")
                        .header("Authorization", "Bearer invalid-token.xyz.123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testAdminEndpoints_WithTechToken_ShouldReturn403() throws Exception {
        String techToken = jwtTokenProvider.generateToken("tech", java.util.List.of("TICKET_VIEW"), "TECHNICIAN");

        mockMvc.perform(post("/api/assets")
                        .header("Authorization", "Bearer " + techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAdminEndpoints_WithAdminToken_ShouldReturnBadRequest() throws Exception {
        String adminToken = jwtTokenProvider.generateToken("admin", java.util.List.of("TICKET_MANAGE", "ASSET_MANAGE"), "ADMIN");

        // Vượt qua 401/403, nhưng body sai format nên trả về 400 Bad Request
        mockMvc.perform(post("/api/assets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testCorsConfiguration_WithAllowedOrigin_ShouldReturnHeaders() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void testCorsConfiguration_WithDisallowedOrigin_ShouldNotReturnAllowOrigin() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "http://hacker.com")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testRefreshToken_WithInvalidToken_ShouldReturn401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"fake-refresh-token\"}"))
                .andExpect(status().isUnauthorized());
    }
}
