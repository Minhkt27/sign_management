package com.hospital.signage.application.service;

import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

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
                .permissions(List.of("TICKET_VIEW"))
                .build();
        lenient().when(roleDatabasePort.findById(ROLE_ID)).thenReturn(Optional.of(role));
        lenient().when(userDatabasePort.countByRoleId(ROLE_ID)).thenReturn(0L);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void vaiTroKhongAiDung_xoaDuoc() {
        roleService.deleteRole(ROLE_ID);

        verify(roleDatabasePort).deleteById(ROLE_ID);
        verify(roleCacheService).evict(ROLE_ID);
    }

    // Khoá ngoại users.role_id cũng chặn, nhưng khi đó người dùng chỉ nhận câu chung chung
    // về "liên kết dữ liệu" và không biết phải chuyển tài khoản nào đi đâu.
    @Test
    void vaiTroConNguoiDung_baoRoSoTaiKhoan() {
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
}
