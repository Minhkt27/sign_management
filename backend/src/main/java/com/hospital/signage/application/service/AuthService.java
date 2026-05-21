package com.hospital.signage.application.service;

import com.hospital.signage.application.port.in.AuthUseCase;
import com.hospital.signage.application.port.out.UserDatabasePort;
import com.hospital.signage.domain.model.User;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService implements AuthUseCase {

    private final UserDatabasePort userDatabasePort;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
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
        return new LoginResult(token, refreshToken, user);
    }

    @Override
    public RefreshResult refreshToken(String refreshToken) {
        String username = jwtTokenProvider.extractUsername(refreshToken);
        User user = userDatabasePort.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.getIsActive()) {
            throw new IllegalStateException("User account is inactive");
        }

        String newToken = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());
        return new RefreshResult(newToken);
    }
}
