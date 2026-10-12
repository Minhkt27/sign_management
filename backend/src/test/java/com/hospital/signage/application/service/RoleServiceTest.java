package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.RoleUseCase;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.Role;
import com.hospital.signage.domain.model.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleServiceTest {

    @Mock private RoleDatabasePort roleDatabasePort;
    @Mock private UserDatabasePort userDatabasePort;
    @Mock private UserAuthorityService.RoleCacheService roleCacheService;

    @InjectMocks private RoleService roleService;

    private static final Long ROLE_ID = 9L;

    @BeforeEach
    void setUp() {
        Role role = Role.builder()
                .id(ROLE_ID).code("GIAM_SAT").name("Giám sát")
                .hospitalId(1L)
                .permissions(List.of("TICKET_VIEW"))
                .build();
        lenient().when(roleDatabasePort.findById(ROLE_ID)).thenReturn(Optional.of(role));
        lenient().when(userDatabasePort.countByRoleId(ROLE_ID)).thenReturn(0L);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void setCaller(Long hospitalId, String... authorities) {
        User caller = User.builder()
                .id(100L)
                .username("test_admin")
                .hospitalId(hospitalId)
                .build();
        var granted = Arrays.stream(authorities)
                .map(SimpleGrantedAuthority::new)
                .toList();
        var auth = new UsernamePasswordAuthenticationToken(caller, null, granted);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void vaiTroKhongAiDung_cungVien_xoaDuoc() {
        setCaller(1L, "ROLE_MANAGE");

        roleService.deleteRole(ROLE_ID);

        verify(roleDatabasePort).deleteById(ROLE_ID);
        verify(roleCacheService).evict(ROLE_ID);
    }

    @Test
    void vaiTroConNguoiDung_baoRoSoTaiKhoan() {
        setCaller(1L, "ROLE_MANAGE");
        when(userDatabasePort.countByRoleId(ROLE_ID)).thenReturn(4L);

        assertThatThrownBy(() -> roleService.deleteRole(ROLE_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("4 tài khoản")
                .hasMessageContaining("nhóm quyền khác");

        verify(roleDatabasePort, never()).deleteById(any());
    }

    @Test
    void vaiTroMacDinh_khongXoaDuoc() {
        Role adminRole = Role.builder()
                .id(2L).code("ADMIN").name("Quản trị")
                .permissions(List.of("USER_MANAGE"))
                .build();
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.of(adminRole));

        assertThatThrownBy(() -> roleService.deleteRole(2L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("mặc định");

        verify(roleDatabasePort, never()).deleteById(any());
    }

    @Test
    void adminVien2_khongDuocXoaVaiTroCuaVien1() {
        setCaller(2L, "ROLE_MANAGE"); // Caller ở viện 2, role thuộc viện 1

        assertThatThrownBy(() -> roleService.deleteRole(ROLE_ID))
                .isInstanceOf(AccessDeniedException.class);

        verify(roleDatabasePort, never()).deleteById(any());
    }

    @Test
    void adminVien_khongDuocXoaVaiTroToanHeThong() {
        setCaller(1L, "ROLE_MANAGE");
        Role globalRole = Role.builder()
                .id(15L).code("CUSTOM_GLOBAL").name("Toàn cục")
                .hospitalId(null)
                .permissions(List.of("TICKET_VIEW"))
                .build();
        when(roleDatabasePort.findById(15L)).thenReturn(Optional.of(globalRole));

        assertThatThrownBy(() -> roleService.deleteRole(15L))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("toàn hệ thống");

        verify(roleDatabasePort, never()).deleteById(any());
    }

    @Test
    void adminVien2_khongXemDuocChiTietVaiTroCuaVien1() {
        setCaller(2L, "ROLE_VIEW"); // Caller ở viện 2, role thuộc viện 1

        assertThatThrownBy(() -> roleService.getRoleById(ROLE_ID))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void adminVien_taoVaiTro_tuDongGanHospitalIdCuaVienDo() {
        setCaller(1L, "ROLE_MANAGE");
        when(roleDatabasePort.findGlobalByCode("DIEU_DUONG")).thenReturn(Optional.empty());
        when(roleDatabasePort.findByCodeAndHospitalId("DIEU_DUONG", 1L)).thenReturn(Optional.empty());
        when(roleDatabasePort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Role created = roleService.createRole(new RoleUseCase.CreateRoleCommand(
                "DIEU_DUONG", "Điều dưỡng", "Mô tả", UiMode.ADMIN, List.of("TICKET_VIEW"), 999L)); // truyền 999L nhưng bị ép về 1L

        assertThat(created.getHospitalId()).isEqualTo(1L);
        assertThat(created.getCode()).isEqualTo("DIEU_DUONG");
    }

    @Test
    void adminVien_taoVaiTro_trungMaToanHeThong_biBaoLoi() {
        setCaller(1L, "ROLE_MANAGE");
        Role existingGlobal = Role.builder().code("GLOBAL_CODE").build();
        when(roleDatabasePort.findGlobalByCode("GLOBAL_CODE")).thenReturn(Optional.of(existingGlobal));

        assertThatThrownBy(() -> roleService.createRole(new RoleUseCase.CreateRoleCommand(
                "GLOBAL_CODE", "Tên", null, UiMode.ADMIN, List.of("TICKET_VIEW"), null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("trùng với nhóm quyền hệ thống");
    }

    @Test
    void getAllRoles_adminVien_chiLayAccessible() {
        setCaller(1L, "ROLE_VIEW");
        Role role1 = Role.builder().id(1L).hospitalId(null).code("ADMIN").build();
        Role role2 = Role.builder().id(2L).hospitalId(1L).code("HOSP1_ROLE").build();
        when(roleDatabasePort.findAllAccessible(1L)).thenReturn(List.of(role1, role2));

        List<Role> result = roleService.getAllRoles(null);

        assertThat(result).hasSize(2);
        verify(roleDatabasePort).findAllAccessible(1L);
    }
}
