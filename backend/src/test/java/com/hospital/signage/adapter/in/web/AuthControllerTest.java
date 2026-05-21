package com.hospital.signage.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.JwtAuthenticationFilter;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.context.annotation.Import;
import com.hospital.signage.infrastructure.security.SecurityConfig;

@WebMvcTest(AuthController.class)
@Import({ SecurityConfig.class, JwtAuthenticationFilter.class })
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthUseCase authUseCase;

    @MockBean
    private UserDatabasePort userDatabasePort;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    public void testLoginSuccess() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setUsername("admin");
        user.setFullName("System Admin");
        user.setRole(Role.ADMIN);
        user.setIsActive(true);

        AuthUseCase.LoginResult mockResult = new AuthUseCase.LoginResult("mock-jwt-token", user);
        when(authUseCase.login(any(AuthUseCase.LoginCommand.class))).thenReturn(mockResult);

        AuthController.LoginRequest request = new AuthController.LoginRequest("admin", "password");

        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-jwt-token"))
                .andExpect(jsonPath("$.user.username").value("admin"))
                .andExpect(jsonPath("$.user.fullName").value("System Admin"));
    }

    @Test
    @WithMockUser(username = "admin", roles = { "ADMIN" })
    public void testGetTechnicians() throws Exception {
        User tech1 = new User();
        tech1.setId(2L);
        tech1.setUsername("tech1");
        tech1.setFullName("John Doe");
        tech1.setRole(Role.TECHNICAL);
        tech1.setIsActive(true);

        User tech2 = new User();
        tech2.setId(3L);
        tech2.setUsername("tech2");
        tech2.setFullName("Jane Doe");
        tech2.setRole(Role.TECHNICAL);
        tech2.setIsActive(true);

        List<User> technicians = Arrays.asList(tech1, tech2);
        when(userDatabasePort.findByRole(Role.TECHNICAL)).thenReturn(technicians);

        mockMvc.perform(get("/api/users/technicians")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("tech1"))
                .andExpect(jsonPath("$[0].fullName").value("John Doe"))
                .andExpect(jsonPath("$[1].username").value("tech2"))
                .andExpect(jsonPath("$[1].fullName").value("Jane Doe"));
    }
}
