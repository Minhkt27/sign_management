package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
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
                    return new IllegalArgumentException("Invalid username or password");
                });

        if (!user.getIsActive()) {
            throw new IllegalStateException("User account is inactive");
        }

        if (!passwordEncoder.matches(command.password(), user.getPassword())) {
            loginAttemptService.recordFailure(command.username());
            throw new IllegalArgumentException("Invalid username or password");
        }

        loginAttemptService.recordSuccess(command.username());

        java.util.List<String> permissions = new java.util.ArrayList<>();
        if (user.getRoleId() != null) {
            roleDatabasePort.findById(user.getRoleId()).ifPresent(role -> {
                if (role.getPermissions() != null) {
                    permissions.addAll(role.getPermissions());
                }
            });
        }
        if (user.getCustomPermissions() != null) {
            permissions.addAll(user.getCustomPermissions());
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), permissions);
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
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired refresh token"));

        if (!user.getIsActive()) {
            throw new IllegalStateException("Invalid or expired refresh token");
        }

        if (user.getRefreshToken() == null || !user.getRefreshToken().equals(refreshToken)) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        java.util.List<String> permissions = new java.util.ArrayList<>();
        if (user.getRoleId() != null) {
            roleDatabasePort.findById(user.getRoleId()).ifPresent(role -> {
                if (role.getPermissions() != null) {
                    permissions.addAll(role.getPermissions());
                }
            });
        }
        if (user.getCustomPermissions() != null) {
            permissions.addAll(user.getCustomPermissions());
        }

        String newToken = jwtTokenProvider.generateToken(user.getUsername(), permissions);

        return new RefreshResult(newToken, refreshToken);
    }

    @Override
    @Transactional
    public void logout(String username) {
        userDatabasePort.findByUsername(username).ifPresent(user -> {
            user.setRefreshToken(null);
            userDatabasePort.save(user);
        });
    }
}
