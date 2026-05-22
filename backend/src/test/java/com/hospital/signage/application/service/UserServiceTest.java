package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.UserUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.Role;
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
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User existingUser;

    @BeforeEach
    void setUp() {
        existingUser = new User();
        existingUser.setId(2L);
        existingUser.setUsername("tech1");
        existingUser.setPassword("hashed");
        existingUser.setRole(Role.TECHNICAL);
        existingUser.setIsActive(true);
    }

    @Test
    void createTechnician_withNewUsername_savesUser() {
        when(userDatabasePort.findByUsername("tech1")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("pass")).thenReturn("hashed");
        when(userDatabasePort.save(any())).thenReturn(existingUser);

        User result = userService.createTechnician(
                new UserUseCase.CreateTechnicianCommand("tech1", "Nguyễn Văn A", "pass"));

        assertThat(result.getRole()).isEqualTo(Role.TECHNICAL);
        verify(userDatabasePort).save(any());
    }

    @Test
    void createTechnician_withDuplicateUsername_throwsIllegalArgument() {
        when(userDatabasePort.findByUsername("tech1")).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> userService.createTechnician(
                new UserUseCase.CreateTechnicianCommand("tech1", "Tên", "pass")))
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
    void changePassword_withWrongCurrentPassword_throwsIllegalArgument() {
        when(userDatabasePort.findById(2L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(
                new UserUseCase.ChangePasswordCommand(2L, "wrong", "newPass")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Mật khẩu hiện tại không đúng");
    }
}
