package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.application.port.out.RoleDatabasePort;
import com.hospital.signage.application.port.out.TicketDatabasePort;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserDatabasePort userDatabasePort;

    @Mock
    private RoleDatabasePort roleDatabasePort;

    @Mock
    private TicketDatabasePort ticketDatabasePort;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserCacheService userCacheService;

    @InjectMocks
    private UserService userService;

    private User existingUser;

    @BeforeEach
    void setUp() {
        existingUser = new User();
        existingUser.setId(2L);
        existingUser.setUsername("tech1");
        existingUser.setPassword("hashed");
        existingUser.setRoleId(2L);
        existingUser.setIsActive(true);
    }

    @Test
    void createUser_withNewUsername_savesUser() {
        when(userDatabasePort.findByUsername("tech1")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("pass")).thenReturn("hashed");
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        User result = userService.createUser(
                new UserUseCase.CreateUserCommand("tech1", "Nguyễn Văn A", "pass", 2L, null, java.util.List.of(), null));

        assertThat(result.getRoleId()).isEqualTo(2L);
        verify(userDatabasePort).save(any());
    }

    @Test
    void createUser_withDuplicateUsername_throwsIllegalArgument() {
        when(userDatabasePort.findByUsername("tech1")).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.createUser(
                new UserUseCase.CreateUserCommand("tech1", "Tên", "pass", 2L, null, java.util.List.of(), null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Tên đăng nhập đã tồn tại");
    }

    @Test
    void setUserActive_false_clearsRefreshToken() {
        existingUser.setRefreshToken("some-token");
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        userService.setUserActive(2L, false);

        assertThat(existingUser.getRefreshToken()).isNull();
        assertThat(existingUser.getIsActive()).isFalse();
    }

    @Test
    void setUserActive_withUnknownId_throwsIllegalArgument() {
        when(userDatabasePort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.setUserActive(99L, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Người dùng không tồn tại");
    }

    @Test
    void changePassword_withCorrectCurrentPassword_savesNewPassword() {
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("oldPass", "hashed")).thenReturn(true);
        when(passwordEncoder.encode("newPass")).thenReturn("new_hashed");
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        userService.changePassword(new UserUseCase.ChangePasswordCommand(2L, "oldPass", "newPass"));

        assertThat(existingUser.getPassword()).isEqualTo("new_hashed");
    }

    @Test
    void deleteUser_withOpenTicket_throwsIllegalState() {
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(ticketDatabasePort.existsOpenTicketForUser(2L)).thenReturn(true);

        assertThatThrownBy(() -> userService.deleteUser(2L))
                .isInstanceOf(IllegalStateException.class);

        verify(userDatabasePort, never()).deleteById(any());
    }

    @Test
    void deleteUser_withOnlyClosedTickets_deletesUser() {
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(ticketDatabasePort.existsOpenTicketForUser(2L)).thenReturn(false);

        userService.deleteUser(2L);

        verify(userDatabasePort).deleteById(2L);
    }

    // Đường vòng qua customPermissions: validateRoleAssignmentAllowed() chặn việc gán một
    // VAI TRÒ có ROLE_MANAGE, nhưng nếu không chặn cả customPermissions thì người chỉ có
    // USER_MANAGE vẫn tự cấp thẳng được quyền đó cho mình.
    @Test
    void updateRoleAndPermissions_grantingRoleManageWithoutHavingIt_isDenied() {
        setCaller("USER_MANAGE");
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUserRoleAndPermissions(
                2L, null, java.util.List.of("ROLE_MANAGE")))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("ROLE_MANAGE");

        verify(userDatabasePort, never()).save(any());
    }

    @Test
    void updateRoleAndPermissions_grantingUserManageWithoutRoleManage_isDenied() {
        setCaller("USER_MANAGE");
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUserRoleAndPermissions(
                2L, null, java.util.List.of("USER_MANAGE")))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        verify(userDatabasePort, never()).save(any());
    }

    @Test
    void updateRoleAndPermissions_grantingRoleManageWhenCallerHasIt_isAllowed() {
        setCaller("USER_MANAGE", "ROLE_MANAGE");
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        userService.updateUserRoleAndPermissions(2L, null, java.util.List.of("ROLE_MANAGE"));

        verify(userDatabasePort).save(any());
    }

    @Test
    void updateRoleAndPermissions_withOrdinaryPermission_isAllowed() {
        setCaller("USER_MANAGE");
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        userService.updateUserRoleAndPermissions(2L, null, java.util.List.of("TICKET_VIEW"));

        verify(userDatabasePort).save(any());
    }

    private void setCaller(String... authorities) {
        var granted = java.util.Arrays.stream(authorities)
                .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                .toList();
        var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "caller", null, granted);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @org.junit.jupiter.api.AfterEach
    void clearSecurityContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    // ── Buộc đổi mật khẩu tạm ──────────────────────────────────────────────

    @Test
    void resetPassword_batNguoiDungPhaiDoiMatKhau() {
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed_temp");
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        String temp = userService.resetPassword(2L);

        assertThat(temp).isNotBlank();
        assertThat(existingUser.getMustChangePassword())
                .as("mật khẩu tạm đi qua tay quản trị viên nên không được dùng lâu dài")
                .isTrue();
    }

    @Test
    void createUser_taiKhoanMoiPhaiDoiMatKhauLanDau() {
        when(userDatabasePort.findByUsername("tech1")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("pass")).thenReturn("hashed");
        when(userDatabasePort.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User created = userService.createUser(
                new UserUseCase.CreateUserCommand("tech1", "Nguyễn Văn A", "pass", 2L, null, java.util.List.of(), null));

        assertThat(created.getMustChangePassword()).isTrue();
    }

    @Test
    void changePassword_tatCoBuocDoiMatKhau() {
        existingUser.setMustChangePassword(true);
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("oldPass", "hashed")).thenReturn(true);
        when(passwordEncoder.matches("newPass", "hashed")).thenReturn(false);
        when(passwordEncoder.encode("newPass")).thenReturn("new_hashed");
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        userService.changePassword(new UserUseCase.ChangePasswordCommand(2L, "oldPass", "newPass"));

        assertThat(existingUser.getMustChangePassword()).isFalse();
    }

    @Test
    void changePassword_matKhauMoiTrungMatKhauCu_biTuChoi() {
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("samePass", "hashed")).thenReturn(true);

        assertThatThrownBy(() -> userService.changePassword(
                new UserUseCase.ChangePasswordCommand(2L, "samePass", "samePass")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("khác mật khẩu hiện tại");
    }

    @Test
    void changePassword_withWrongCurrentPassword_throwsIllegalArgument() {
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(
                new UserUseCase.ChangePasswordCommand(2L, "wrong", "newPass")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Mật khẩu hiện tại không đúng");
    }

    @Test
    void ganVaiTroVienKhac_biTuChoi() {
        setCaller("USER_MANAGE");
        existingUser.setHospitalId(1L);
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());

        com.hospital.signage.domain.model.Role roleVien2 = com.hospital.signage.domain.model.Role.builder()
                .id(99L).code("ROLE_HOSP2").hospitalId(2L).build();
        when(roleDatabasePort.findById(99L)).thenReturn(Optional.of(roleVien2));

        assertThatThrownBy(() -> userService.updateUserRoleAndPermissions(2L, 99L, java.util.List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bệnh viện khác");
    }

    @Test
    void ganVaiTroToanHeThong_thanhCong() {
        setCaller("USER_MANAGE");
        existingUser.setHospitalId(1L);
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());

        com.hospital.signage.domain.model.Role globalRole = com.hospital.signage.domain.model.Role.builder()
                .id(50L).code("GLOBAL_NURSE").hospitalId(null).permissions(java.util.List.of("TICKET_VIEW")).build();
        when(roleDatabasePort.findById(50L)).thenReturn(Optional.of(globalRole));
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        userService.updateUserRoleAndPermissions(2L, 50L, java.util.List.of());

        verify(userDatabasePort).save(any());
    }

    // ── Bảo vệ tài khoản quản lý nhân viên ─────────────────────────────────
    // Admin viện không được đụng vào Admin khác (đặt lại mật khẩu = chiếm tài khoản);
    // chỉ Quản trị hệ thống làm được. Tài khoản Quản trị hệ thống thì không ai làm được.

    private static final long ADMIN_ROLE_ID = 1L;
    private static final long SUPER_ROLE_ID = 3L;

    private User adminTarget() {
        User u = new User();
        u.setId(4L);
        u.setUsername("adminA");
        u.setPassword("hashed");
        u.setRoleId(ADMIN_ROLE_ID);
        u.setHospitalId(2L);
        u.setIsActive(true);
        when(userDatabasePort.findById(4L)).thenReturn(Optional.of(u));
        when(roleDatabasePort.findById(ADMIN_ROLE_ID)).thenReturn(Optional.of(
                com.hospital.signage.domain.model.Role.builder().id(ADMIN_ROLE_ID).code("ADMIN")
                        .permissions(java.util.List.of("USER_MANAGE", "ROLE_MANAGE", "ASSET_VIEW")).build()));
        return u;
    }

    private void callerIsHospitalAdmin() {
        setCaller("USER_MANAGE", "ROLE_MANAGE");
    }

    private void callerIsSuperAdmin() {
        setCaller("HOSPITAL_MANAGE", "USER_MANAGE", "ROLE_MANAGE");
    }

    @Test
    void adminVien_datLaiMatKhauAdminKhac_biTuChoi() {
        callerIsHospitalAdmin();
        adminTarget();

        assertThatThrownBy(() -> userService.resetPassword(4L))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(userDatabasePort, never()).save(any());
    }

    // Đường vòng: hạ Admin xuống Kỹ thuật viên rồi mới đặt lại mật khẩu.
    @Test
    void adminVien_haVaiTroAdminKhac_biTuChoi() {
        callerIsHospitalAdmin();
        adminTarget();

        assertThatThrownBy(() -> userService.updateUserRoleAndPermissions(4L, 2L, java.util.List.of()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(userDatabasePort, never()).save(any());
    }

    @Test
    void adminVien_khoaHoacXoaAdminKhac_biTuChoi() {
        callerIsHospitalAdmin();
        adminTarget();

        assertThatThrownBy(() -> userService.setUserActive(4L, false))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThatThrownBy(() -> userService.deleteUser(4L))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(userDatabasePort, never()).save(any());
        verify(userDatabasePort, never()).deleteById(any());
    }

    // Quyền quản lý cấp riêng cho một Kỹ thuật viên cũng được bảo vệ như Admin.
    @Test
    void adminVien_datLaiMatKhauNguoiCoQuyenQuanLyCapRieng_biTuChoi() {
        callerIsHospitalAdmin();
        existingUser.setCustomPermissions(java.util.List.of("USER_MANAGE"));
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.resetPassword(2L))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void adminVien_datLaiMatKhauKyThuatVien_thanhCong() {
        callerIsHospitalAdmin();
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.encode(any())).thenReturn("hashed_temp");
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        assertThat(userService.resetPassword(2L)).isNotBlank();
    }

    @Test
    void superAdmin_datLaiMatKhauAdminVien_thanhCong() {
        callerIsSuperAdmin();
        User admin = adminTarget();
        when(passwordEncoder.encode(any())).thenReturn("hashed_temp");
        when(userDatabasePort.save(any())).thenReturn(admin);

        assertThat(userService.resetPassword(4L)).isNotBlank();
        assertThat(admin.getMustChangePassword()).isTrue();
        assertThat(admin.getRefreshToken()).isNull();
    }

    @Test
    void superAdmin_xoaAdminVien_thanhCong() {
        callerIsSuperAdmin();
        adminTarget();
        when(ticketDatabasePort.existsOpenTicketForUser(4L)).thenReturn(false);

        userService.deleteUser(4L);

        verify(userDatabasePort).deleteById(4L);
    }

    @Test
    void khongAiDatLaiMatKhauHoacXoaTaiKhoanQuanTriHeThong() {
        callerIsSuperAdmin();
        User superUser = new User();
        superUser.setId(1L);
        superUser.setRoleId(SUPER_ROLE_ID);
        when(userDatabasePort.findById(1L)).thenReturn(Optional.of(superUser));
        when(roleDatabasePort.findById(SUPER_ROLE_ID)).thenReturn(Optional.of(
                com.hospital.signage.domain.model.Role.builder().id(SUPER_ROLE_ID).code("SUPER_ADMIN")
                        .permissions(java.util.List.of("HOSPITAL_MANAGE")).build()));

        assertThatThrownBy(() -> userService.resetPassword(1L)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> userService.deleteUser(1L)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> userService.updateUserRoleAndPermissions(1L, 2L, java.util.List.of()))
                .isInstanceOf(IllegalStateException.class);
        verify(userDatabasePort, never()).save(any());
        verify(userDatabasePort, never()).deleteById(any());
    }

    @Test
    void ganVaiTroVien_choTaiKhoanSuperAdmin_biTuChoi() {
        setCaller("USER_MANAGE");
        existingUser.setHospitalId(null);
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(roleDatabasePort.findById(2L)).thenReturn(Optional.empty());

        com.hospital.signage.domain.model.Role roleVien1 = com.hospital.signage.domain.model.Role.builder()
                .id(99L).code("ROLE_HOSP1").hospitalId(1L).build();
        when(roleDatabasePort.findById(99L)).thenReturn(Optional.of(roleVien1));

        assertThatThrownBy(() -> userService.updateUserRoleAndPermissions(2L, 99L, java.util.List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("toàn hệ thống");
    }
}
