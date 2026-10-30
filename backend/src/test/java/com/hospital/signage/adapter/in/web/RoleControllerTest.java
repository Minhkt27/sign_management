package com.hospital.signage.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.signage.application.port.in.RoleUseCase;
import com.hospital.signage.application.service.UserAuthorityService;
import com.hospital.signage.application.service.UserCacheService;
import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.Role;
import com.hospital.signage.infrastructure.security.JwtAuthenticationFilter;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import com.hospital.signage.infrastructure.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoleController.class)
@Import({ SecurityConfig.class, JwtAuthenticationFilter.class })
public class RoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RoleUseCase roleUseCase;

    @MockBean
    private UserCacheService userCacheService;

    @MockBean
    private UserAuthorityService userAuthorityService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @WithMockUser(authorities = {"ROLE_VIEW"})
    void getAllRoles_coQuyen_traVeDanhSach() throws Exception {
        Role role1 = Role.builder().id(1L).code("ADMIN").name("Quản trị").hospitalId(null).build();
        Role role2 = Role.builder().id(2L).code("NURSE").name("Điều dưỡng").hospitalId(1L).build();
        when(roleUseCase.getAllRoles(any())).thenReturn(List.of(role1, role2));

        mockMvc.perform(get("/api/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].code").value("ADMIN"))
                .andExpect(jsonPath("$[1].code").value("NURSE"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_MANAGE"})
    void createRole_coQuyen_taoThanhCong() throws Exception {
        Role created = Role.builder()
                .id(10L)
                .code("KY_THUAT")
                .name("Kỹ thuật")
                .hospitalId(1L)
                .build();
        when(roleUseCase.createRole(any())).thenReturn(created);

        var request = new RoleController.CreateRoleRequest(
                "KY_THUAT", "Kỹ thuật", "Mô tả", UiMode.ADMIN, List.of("TICKET_VIEW"), 1L);

        mockMvc.perform(post("/api/roles")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.code").value("KY_THUAT"));

        verify(roleUseCase).createRole(any());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_MANAGE"})
    void deleteRole_coQuyen_xoaThanhCong() throws Exception {
        mockMvc.perform(delete("/api/roles/10").with(csrf()))
                .andExpect(status().isOk());

        verify(roleUseCase).deleteRole(10L);
    }

    @Test
    @WithMockUser(authorities = {"ASSET_VIEW"}) // Không có ROLE_VIEW lẫn ROLE_MANAGE
    void getAllRoles_khongCoQuyen_biCam() throws Exception {
        mockMvc.perform(get("/api/roles"))
                .andExpect(status().isForbidden());
    }
}
