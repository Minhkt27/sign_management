package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.exception.AccountInactiveException;
import com.hospital.signage.domain.exception.InvalidCredentialsException;
import com.hospital.signage.domain.enums.UiMode;
import com.hospital.signage.domain.model.Role;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import com.hospital.signage.infrastructure.security.LoginAttemptService;
import com.hospital.signage.application.port.out.RoleDatabasePort;
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
    private final RoleDatabasePort roleDatabasePort;

    @Override
    @Transactional
    public LoginResult login(LoginCommand command) {
        if (loginAttemptService.isBlocked(command.username())) {
            throw new IllegalStateException("Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.");
        }

        User user = userDatabasePort.findByUsername(command.username())
                .orElseThrow(() -> {
                    loginAttemptService.recordFailure(command.username());
                    return new InvalidCredentialsException("Invalid username or password");
                });

        if (!user.getIsActive()) {
            throw new AccountInactiveException("User account is inactive");
        }

        if (!passwordEncoder.matches(command.password(), user.getPassword())) {
            loginAttemptService.recordFailure(command.username());
            throw new InvalidCredentialsException("Invalid username or password");
        }

        loginAttemptService.recordSuccess(command.username());

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

    private AuthClaims buildAuthClaims(User user) {
        java.util.List<String> permissions = new java.util.ArrayList<>();
        UiMode uiMode = UiMode.ADMIN;
        if (user.getRoleId() != null) {
            Role role = roleDatabasePort.findById(user.getRoleId()).orElse(null);
            if (role != null) {
                if (role.getPermissions() != null) permissions.addAll(role.getPermissions());
                if (role.getUiMode() != null) uiMode = role.getUiMode();
            }
        }
        if (user.getCustomPermissions() != null) {
            permissions.addAll(user.getCustomPermissions());
        }
        return new AuthClaims(permissions, uiMode.name());
    }

    private record AuthClaims(java.util.List<String> permissions, String uiMode) {
    }
}
