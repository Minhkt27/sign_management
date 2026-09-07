package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;

import com.hospital.signage.domain.exception.AccountInactiveException;
import com.hospital.signage.domain.exception.InvalidCredentialsException;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import com.hospital.signage.infrastructure.security.LoginAttemptService;
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
    private UserAuthorityService userAuthorityService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private LoginAttemptService loginAttemptService;

    @InjectMocks
    private AuthService authService;

    private static final String CLIENT_IP = "203.0.113.10";

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = new User();
        activeUser.setId(1L);
        activeUser.setUsername("admin");
        activeUser.setPassword("hashed_password");
        activeUser.setRoleId(1L);
        activeUser.setIsActive(true);

        // Quyền/uiMode giờ do UserAuthorityService quyết định (dùng chung với filter).
        // lenient vì các test nhánh lỗi không đi tới bước phát token.
        lenient().when(userAuthorityService.resolvePermissions(any()))
                .thenReturn(java.util.List.of("ASSET_MANAGE"));
        lenient().when(userAuthorityService.resolveUiMode(any()))
                .thenReturn(com.hospital.signage.domain.enums.UiMode.ADMIN);
    }

    @Test
    void login_withValidCredentials_returnsTokens() {
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("plain", "hashed_password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(eq("admin"), anyList(), anyString(), any())).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken("admin")).thenReturn("refresh-token");
        when(userDatabasePort.save(any())).thenReturn(activeUser);

        AuthUseCase.LoginResult result = authService.login(new AuthUseCase.LoginCommand("admin", "plain", CLIENT_IP));

        assertThat(result.token()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        assertThat(result.user().getUsername()).isEqualTo("admin");
    }

    @Test
    void login_withUnknownUsername_throwsInvalidCredentials() {
        when(userDatabasePort.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("unknown", "pass", CLIENT_IP)))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid username or password");
    }

    @Test
    void login_withWrongPassword_throwsInvalidCredentials() {
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong", "hashed_password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("admin", "wrong", CLIENT_IP)))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid username or password");
    }

    @Test
    void login_withInactiveUser_throwsAccountInactive() {
        activeUser.setIsActive(false);
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("admin", "plain", CLIENT_IP)))
                .isInstanceOf(AccountInactiveException.class)
                .hasMessage("User account is inactive");
    }

    @Test
    void refreshToken_withValidToken_returnsNewAccessToken() {
        activeUser.setRefreshToken("valid-refresh");
        when(jwtTokenProvider.extractUsername("valid-refresh")).thenReturn("admin");
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(jwtTokenProvider.generateToken(eq("admin"), anyList(), anyString(), any())).thenReturn("new-access-token");
        when(jwtTokenProvider.generateRefreshToken("admin")).thenReturn("new-refresh-token");

        AuthUseCase.RefreshResult result = authService.refreshToken("valid-refresh");

        assertThat(result.token()).isEqualTo("new-access-token");
        assertThat(result.refreshToken()).isEqualTo("new-refresh-token");
    }

    @Test
    void refreshToken_withUnknownUser_throwsInvalidCredentials() {
        when(jwtTokenProvider.extractUsername("bad-refresh")).thenReturn("ghost");
        when(userDatabasePort.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refreshToken("bad-refresh"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid or expired refresh token");
    }

    @Test
    void refreshToken_withAccessToken_isRejected() {
        when(jwtTokenProvider.isAccessToken("an-access-token")).thenReturn(true);

        assertThatThrownBy(() -> authService.refreshToken("an-access-token"))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid or expired refresh token");

        verify(userDatabasePort, never()).findByUsername(any());
    }

    @Test
    void refreshToken_withLegacyTokenWithoutTypeClaim_stillWorks() {
        activeUser.setRefreshToken("legacy-refresh");
        when(jwtTokenProvider.isAccessToken("legacy-refresh")).thenReturn(false);
        when(jwtTokenProvider.extractUsername("legacy-refresh")).thenReturn("admin");
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(jwtTokenProvider.generateToken(eq("admin"), anyList(), anyString(), any())).thenReturn("new-access-token");
        when(jwtTokenProvider.generateRefreshToken("admin")).thenReturn("new-refresh-token");

        AuthUseCase.RefreshResult result = authService.refreshToken("legacy-refresh");

        assertThat(result.token()).isEqualTo("new-access-token");
    }

    @Test
    void login_whenBlocked_throwsIllegalState() {
        when(loginAttemptService.isBlocked("admin", CLIENT_IP)).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("admin", "any", CLIENT_IP)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Quá nhiều lần đăng nhập thất bại");

        verify(userDatabasePort, never()).findByUsername(any());
    }

    @Test
    void login_withWrongPassword_recordsFailure() {
        when(loginAttemptService.isBlocked("admin", CLIENT_IP)).thenReturn(false);
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong", "hashed_password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new AuthUseCase.LoginCommand("admin", "wrong", CLIENT_IP)))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(loginAttemptService).recordFailure("admin", CLIENT_IP);
    }

    @Test
    void login_withValidCredentials_recordsSuccess() {
        when(loginAttemptService.isBlocked("admin", CLIENT_IP)).thenReturn(false);
        when(userDatabasePort.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("plain", "hashed_password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(eq("admin"), anyList(), anyString(), any())).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken("admin")).thenReturn("refresh-token");
        when(userDatabasePort.save(any())).thenReturn(activeUser);

        authService.login(new AuthUseCase.LoginCommand("admin", "plain", CLIENT_IP));

        verify(loginAttemptService).recordSuccess("admin", CLIENT_IP);
    }
}
