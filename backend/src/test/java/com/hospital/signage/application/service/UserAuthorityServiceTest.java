package com.hospital.signage.application.service;

import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.Role;
import com.hospital.signage.domain.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAuthorityServiceTest {

    @Mock
    private UserAuthorityService.RoleCacheService roleCacheService;

    @InjectMocks
    private UserAuthorityService userAuthorityService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(2L);
        user.setUsername("tech1");
        user.setRoleId(5L);
    }

    @Test
    void permissionsCombineRoleAndCustomPermissions() {
        user.setCustomPermissions(List.of("FILE_UPLOAD"));
        when(roleCacheService.findById(5L)).thenReturn(Optional.of(Role.builder()
                .id(5L).code("TECHNICAL")
                .permissions(List.of("TICKET_MANAGE", "TICKET_VIEW"))
                .uiMode(UiMode.TECHNICIAN)
                .build()));

        assertThat(userAuthorityService.resolvePermissions(user))
                .containsExactlyInAnyOrder("TICKET_MANAGE", "TICKET_VIEW", "FILE_UPLOAD");
    }

    // Điểm mấu chốt của việc thu hồi quyền: quyền hiệu lực đọc từ vai trò hiện tại trong
    // database, nên bỏ một quyền khỏi vai trò là có tác dụng ngay, không phải đợi token hết hạn.
    @Test
    void removingPermissionFromRoleTakesEffectImmediately() {
        user.setCustomPermissions(List.of());
        when(roleCacheService.findById(5L)).thenReturn(Optional.of(Role.builder()
                .id(5L).code("TECHNICAL")
                .permissions(List.of("TICKET_VIEW"))
                .build()));

        assertThat(userAuthorityService.resolvePermissions(user))
                .containsExactly("TICKET_VIEW")
                .doesNotContain("TICKET_MANAGE");
    }

    @Test
    void userWithoutRoleStillGetsCustomPermissions() {
        user.setRoleId(null);
        user.setCustomPermissions(List.of("TICKET_VIEW"));

        assertThat(userAuthorityService.resolvePermissions(user)).containsExactly("TICKET_VIEW");
    }

    @Test
    void missingRoleYieldsNoPermissions() {
        user.setCustomPermissions(null);
        when(roleCacheService.findById(5L)).thenReturn(Optional.empty());

        assertThat(userAuthorityService.resolvePermissions(user)).isEmpty();
    }

    @Test
    void uiModeComesFromRole() {
        when(roleCacheService.findById(5L)).thenReturn(Optional.of(Role.builder()
                .id(5L).code("TECHNICAL").uiMode(UiMode.TECHNICIAN).build()));

        assertThat(userAuthorityService.resolveUiMode(user)).isEqualTo(UiMode.TECHNICIAN);
    }

    @Test
    void uiModeFallsBackToAdminWhenRoleMissing() {
        user.setRoleId(null);

        assertThat(userAuthorityService.resolveUiMode(user)).isEqualTo(UiMode.ADMIN);
    }
}
