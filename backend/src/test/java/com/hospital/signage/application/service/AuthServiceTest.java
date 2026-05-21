package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.enums.Role;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserDatabasePort userDatabasePort;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = new User();
        activeUser.setId(1L);
        activeUser.setUsername("admin");
        activeUser.setPassword("hashed_password");
        activeUser.setRole(Role.ADMIN);
        activeUser.setIsActive(true);
    }

    @Test
    void login_withValidCredentials_returnsTokens() {
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("plain", "hashed_password")).thenReturn(true);
        when(jwtTokenProvider.generateToken("admin", "ADMIN")).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken("admin")).thenReturn("refresh-token");
        when(userDatabasePort.save(any())).thenReturn(activeUser);

        AuthUseCase.LoginResult result = authService.login(new AuthUseCase.LoginCommand("admin", "plain"));

        assertThat(result.token()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        assertThat(result.user().getUsername()).isEqualTo("admin");
    }

    @Test
    void login_withUnknownUsername_throwsIllegalArgument() {
        when(userDatabasePort.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("unknown", "pass")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid username or password");
    }

    @Test
    void login_withWrongPassword_throwsIllegalArgument() {
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong", "hashed_password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("admin", "wrong")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid username or password");
    }

    @Test
    void login_withInactiveUser_throwsIllegalState() {
        activeUser.setIsActive(false);
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("admin", "plain")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User account is inactive");
    }

    @Test
    void refreshToken_withValidToken_returnsNewAccessToken() {
        activeUser.setRefreshToken("valid-refresh");
        when(jwtTokenProvider.extractUsername("valid-refresh")).thenReturn("admin");
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(jwtTokenProvider.generateToken("admin", "ADMIN")).thenReturn("new-access-token");
        when(jwtTokenProvider.generateRefreshToken("admin")).thenReturn("new-refresh-token");
        when(userDatabasePort.save(any())).thenReturn(activeUser);

        AuthUseCase.RefreshResult result = authService.refreshToken("valid-refresh");

        assertThat(result.token()).isEqualTo("new-access-token");
        assertThat(result.refreshToken()).isEqualTo("new-refresh-token");
    }

    @Test
    void refreshToken_withUnknownUser_throwsIllegalArgument() {
        when(jwtTokenProvider.extractUsername("bad-refresh")).thenReturn("ghost");
        when(userDatabasePort.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refreshToken("bad-refresh"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired refresh token");
    }
}
