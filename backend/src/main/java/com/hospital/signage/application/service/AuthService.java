package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.exception.AccountInactiveException;
import com.hospital.signage.domain.exception.InvalidCredentialsException;
import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import com.hospital.signage.infrastructure.security.LoginAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService implements AuthUseCase {

    private final UserDatabasePort userDatabasePort;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final LoginAttemptService loginAttemptService;
    private final UserAuthorityService userAuthorityService;

    @Override
    @Transactional
    public LoginResult login(LoginCommand command) {
        if (loginAttemptService.isBlocked(command.username(), command.clientIp())) {
            throw new IllegalStateException("Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.");
        }

        User user = userDatabasePort.findByUsername(command.username())
                .orElseThrow(() -> {
                    loginAttemptService.recordFailure(command.username(), command.clientIp());
                    return new InvalidCredentialsException("Invalid username or password");
                });

        if (!user.getIsActive()) {
            throw new AccountInactiveException("User account is inactive");
        }

        if (!passwordEncoder.matches(command.password(), user.getPassword())) {
            loginAttemptService.recordFailure(command.username(), command.clientIp());
            throw new InvalidCredentialsException("Invalid username or password");
        }

        loginAttemptService.recordSuccess(command.username(), command.clientIp());

        AuthClaims claims = buildAuthClaims(user);
        String token = jwtTokenProvider.generateToken(user.getUsername(), claims.permissions(), claims.uiMode(), user.getHospitalId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        user.setRefreshToken(refreshToken);
        userDatabasePort.save(user);

        return new LoginResult(token, refreshToken, user);
    }

    @Override
    @Transactional
    public RefreshResult refreshToken(String refreshToken) {
        // Chiều ngược lại của kiểm tra trong JwtAuthenticationFilter: access token không được
        // dùng để xin token mới. Token cũ chưa có claim "typ" vẫn qua được (giai đoạn chuyển tiếp).
        if (jwtTokenProvider.isAccessToken(refreshToken)) {
            throw new InvalidCredentialsException("Invalid or expired refresh token");
        }

        String username = jwtTokenProvider.extractUsername(refreshToken);
        User user = userDatabasePort.findByUsername(username)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid or expired refresh token"));

        if (!user.getIsActive()) {
            throw new AccountInactiveException("Invalid or expired refresh token");
        }

        if (user.getRefreshToken() == null || !user.getRefreshToken().equals(refreshToken)) {
            throw new InvalidCredentialsException("Invalid or expired refresh token");
        }

        AuthClaims claims = buildAuthClaims(user);
        String newToken = jwtTokenProvider.generateToken(user.getUsername(), claims.permissions(), claims.uiMode(), user.getHospitalId());
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        user.setRefreshToken(newRefreshToken);
        userDatabasePort.save(user);

        return new RefreshResult(newToken, newRefreshToken);
    }

    @Override
    @Transactional
    public void logout(String username) {
        userDatabasePort.findByUsername(username).ifPresent(user -> {
            user.setRefreshToken(null);
            userDatabasePort.save(user);
        });
    }

    // Dùng chung UserAuthorityService với JwtAuthenticationFilter: quyền ghi vào token (cho
    // giao diện) và quyền backend thực sự kiểm tra phải được tính từ cùng một chỗ, nếu không
    // sẽ có cảnh menu hiện ra nhưng bấm vào lại bị 403.
    private AuthClaims buildAuthClaims(User user) {
        UiMode uiMode = userAuthorityService.resolveUiMode(user);
        return new AuthClaims(userAuthorityService.resolvePermissions(user), uiMode.name());
    }

    private record AuthClaims(java.util.List<String> permissions, String uiMode) {
    }
}
