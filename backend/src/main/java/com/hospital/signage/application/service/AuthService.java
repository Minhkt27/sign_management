package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
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

    @Override
    @Transactional
    public LoginResult login(LoginCommand command) {
        User user = userDatabasePort.findByUsername(command.username())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!user.getIsActive()) {
            throw new IllegalStateException("User account is inactive");
        }

        if (!passwordEncoder.matches(command.password(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());
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

        String newToken = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());
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
}
